import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Plant, PlantPhoto } from '../lib/types'
import { LIGHTS } from '../lib/art'
import { gkey, genusGroups, sortList } from '../lib/helpers'
import { supabase, photoUrl } from '../lib/supabase'
import { CardGrid, GenusCards, GenusShelf, IllusShelf } from './PlantViews'

interface Pub { shelf_name: string; show_prices: boolean; plants: (Plant & { photos?: string[] })[] }

function PublicModal({ p, pub, onClose }: { p: Plant & { photos?: string[] }; pub: Pub; onClose: () => void }) {
  const rows: [string, unknown][] = [
    ['Genus', p.genus], ['Species', p.species], ['Cultivar', p.cultivar], ['Variant', p.variant], ['Stage', p.purchase_stage],
    ['Status', p.sold ? 'Sold' : p.shipping ? 'On its way' : p.have_it ? 'In the collection' : 'Wanted'],
    ['For sale', p.for_sale && !p.sold ? (p.asking_price != null ? '$' + p.asking_price : 'Yes') : ''],
    ['Paid', pub.show_prices && p.purchase_price != null ? '$' + p.purchase_price : ''],
    ['Seller', p.seller_name], ['Bought from', p.sourced_from], ['Grown from', p.grown_from], ['Lineage', p.lineage],
    ['Medium', p.soil_medium], ['Soil likes', p.soil_likes], ['pH', p.ph], ['Light', p.light],
    ['Temperature', p.temp == null ? '' : p.temp + '°F'], ['Humidity', p.humidity == null ? '' : p.humidity + '%'], ['Watering', p.watering_needs],
    ['Last watered', p.last_watered], ['Water every', p.water_every_days == null ? '' : p.water_every_days + ' days'], ['Notes', p.notes],
  ]
  const shown = rows.filter(([, v]) => v != null && v !== '')
  const pics = p.photos ?? []
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="msheet">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{p.plant_name}</h3>
          <button className="link" style={{ color: 'var(--sage-d)' }} onClick={onClose}>Close</button>
        </div>
        {pics.length > 0 && (
          <>
            <img className="bigph" alt="" src={photoUrl(pics[0])} />
            {pics.length > 1 && <div className="gal">{pics.slice(1).map((x) => <div className="ph" key={x}><img loading="lazy" alt="" src={photoUrl(x)} /></div>)}</div>}
          </>
        )}
        <dl className="kv">{shown.map(([l, v]) => <Fragment key={l}><dt>{l}</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{String(v)}</dd></Fragment>)}</dl>
      </div>
    </div>
  )
}

export default function PublicView({ slug, mineSlug }: { slug: string; mineSlug?: string }) {
  const [pub, setPub] = useState<Pub | null | undefined>(undefined)
  const [err, setErr] = useState('')
  const [view, setView] = useState<'shelf' | 'cards'>('shelf')
  const [gsel, setGsel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<string | null>(null)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')

  useEffect(() => {
    supabase.rpc('get_public_shelf', { p_slug: slug }).then((r) => {
      if (r.error) return setErr('Could not load this shelf.')
      setPub((r.data as Pub) ?? null)
    })
  }, [slug])

  const plants = useMemo(() => (pub?.plants ?? []).map((p, i) => ({ ...p, id: 'pub' + i })), [pub])
  const photos = useMemo(() => {
    const m: Record<string, PlantPhoto[]> = {}
    plants.forEach((p) => { if (p.photos?.length) m[p.id] = p.photos.map((path, i) => ({ id: path, plant_id: p.id, path, position: i, created_at: '' })) })
    return m
  }, [plants])
  const list = plants.filter((p) => !q || `${p.plant_name} ${p.genus || ''}`.toLowerCase().includes(q.toLowerCase()))
  const mine = !!mineSlug && mineSlug === slug
  const home = location.pathname

  const banner = (
    <div className={'pubbar ' + (mine ? 'mine' : '')}>
      {mine
        ? <><span><b>This is your public page.</b> This is exactly what visitors see.</span><a href={home}>Back to my shelf</a></>
        : <><span><b>Public view</b> · you are looking at a shared shelf. It is read-only.</span><a href={home}>Make your own</a></>}
    </div>
  )
  const top = (
    <div className="hdr"><div />
      <div className="hbtns">
        <button className="hbtn" onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('theme', t) } catch { /* ignore */ } }}>
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
      </div>
    </div>
  )

  if (err) return <>{banner}{top}<div className="wrap"><div className="card err">{err}</div></div></>
  if (pub === undefined) return <>{banner}{top}<div className="wrap"><p className="mut">Loading...</p></div></>
  if (pub === null)
    return <>{banner}{top}<div className="wrap"><div className="card"><h3>This shelf is private</h3><p className="mut">The owner has not shared it, or the link has changed.</p></div></div></>

  const searching = !!q
  const open = (id: string) => setModal(id)
  let body
  if (!searching && gsel == null) {
    body = view === 'cards'
      ? <GenusCards list={list} photos={photos} onOpen={setGsel} />
      : <GenusShelf list={list} photos={photos} onOpen={setGsel} />
  } else {
    let sub = list
    let head = null
    if (!searching && gsel != null) {
      sub = list.filter((p) => gkey(p) === gsel)
      head = (<><button className="link back" onClick={() => setGsel(null)}>← All genera</button><h2 className="gtitle">{gsel}</h2></>)
    }
    sub = sortList(sub, 'name')
    body = <>{head}{!sub.length ? <p className="mut">Nothing matches.</p> : view === 'cards'
      ? <CardGrid list={sub} all={plants} photos={photos} onOpen={open} readOnly />
      : <IllusShelf list={sub} photos={photos} onOpen={open} />}</>
  }
  const modalPlant = plants.find((p) => p.id === modal)

  return (
    <>
      {banner}{top}
      <div className="wrap">
        <div className="hero" style={{ padding: 0 }}>
          <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: LIGHTS }} />
          <h1 className="title">{pub.shelf_name}</h1>
          <p className="greet">{plants.length} plants, {genusGroups(plants).length} genera. Tap any plant to see more.</p>
        </div>
        <div className="seg">
          {(['shelf', 'cards'] as const).map((v) => <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        </div>
        <div className="row" style={{ margin: '10px 0 4px' }}>
          <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, margin: 0 }} />
        </div>
        {body}
      </div>
      {modalPlant && <PublicModal p={modalPlant} pub={pub} onClose={() => setModal(null)} />}
    </>
  )
}
