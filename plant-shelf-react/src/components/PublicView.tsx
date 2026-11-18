import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Plant, PlantPhoto } from '../lib/types'
import { LIGHTS } from '../lib/art'
import { gkey, genusGroups, sortList } from '../lib/helpers'
import { Check, Heart, Plus } from 'lucide-react'
import { supabase, photoUrl } from '../lib/supabase'
import { CardGrid, GenusCards, GenusShelf, IllusShelf, type FavApi } from './PlantViews'

interface Pub { owner_id?: string; shared?: boolean; shelf_name: string; show_prices: boolean; plants: (Plant & { photos?: string[] })[] }

function PublicModal({ p, pub, onClose, faved, onHeart }: { p: Plant & { photos?: string[] }; pub: Pub; onClose: () => void; faved?: boolean; onHeart?: () => void }) {
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
          <div className="row" style={{ alignItems: 'center', gap: 12 }}>
            {onHeart && <button className="link" aria-label={faved ? 'Remove from favorites' : 'Add to favorites'} onClick={onHeart} style={{ color: '#c0392b' }}><Heart size={24} fill={faved ? '#c0392b' : 'none'} /></button>}
            <button className="link" style={{ color: 'var(--sage-d)' }} onClick={onClose}>Close</button>
          </div>
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

export default function PublicView({ slug, mineSlug, userId }: { slug: string; mineSlug?: string; userId?: string }) {
  const [pub, setPub] = useState<Pub | null | undefined>(undefined)
  const [err, setErr] = useState('')
  const [view, setView] = useState<'shelf' | 'cards'>('shelf')
  const [gsel, setGsel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')

  useEffect(() => {
    supabase.rpc('get_public_shelf', { p_slug: slug }).then((r) => {
      if (r.error) return setErr('Could not load this shelf.')
      setPub((r.data as Pub) ?? null)
    })
  }, [slug])

  useEffect(() => {
    if (!userId || !pub?.owner_id) return
    supabase.from('follows').select('followed_id').eq('follower_id', userId).eq('followed_id', pub.owner_id).maybeSingle().then((r) => setFollowing(!!r.data))
    supabase.from('favorites').select('plant_id').eq('user_id', userId).then((r) => setFavs(new Set((r.data ?? []).map((x) => x.plant_id as string))))
  }, [userId, pub?.owner_id])

  // Opened from the Favorites list: ?shelf=slug&plant=uid
  useEffect(() => {
    const want = new URLSearchParams(location.search).get('plant')
    if (!want || !pub) return
    const i = pub.plants.findIndex((p) => p.uid === want)
    if (i >= 0) setModal('pub' + i)
  }, [pub])

  async function toggleFollow() {
    if (!userId || !pub?.owner_id) return
    const was = following
    setFollowing(!was)
    const r = was
      ? await supabase.from('follows').delete().eq('follower_id', userId).eq('followed_id', pub.owner_id)
      : await supabase.from('follows').insert({ follower_id: userId, followed_id: pub.owner_id })
    if (r.error) setFollowing(was)
  }
  async function toggleHeart(uid: string) {
    if (!userId) return
    const was = favs.has(uid)
    setFavs((cur) => { const n = new Set(cur); if (was) n.delete(uid); else n.add(uid); return n })
    const r = was
      ? await supabase.from('favorites').delete().eq('user_id', userId).eq('plant_id', uid)
      : await supabase.from('favorites').insert({ user_id: userId, plant_id: uid })
    if (r.error) setFavs((cur) => { const n = new Set(cur); if (was) n.add(uid); else n.delete(uid); return n })
  }

  const plants = useMemo(() => (pub?.plants ?? []).map((p, i) => ({ ...p, id: 'pub' + i })), [pub])
  const photos = useMemo(() => {
    const m: Record<string, PlantPhoto[]> = {}
    plants.forEach((p) => { if (p.photos?.length) m[p.id] = p.photos.map((path, i) => ({ id: path, plant_id: p.id, path, position: i, created_at: '' })) })
    return m
  }, [plants])
  const list = plants.filter((p) => !q || `${p.plant_name} ${p.genus || ''}`.toLowerCase().includes(q.toLowerCase()))
  const mine = !!mineSlug && mineSlug === slug
  const home = location.pathname

  const banner = mine
    ? <div className="pubbar mine"><span><b>This is your public page.</b> This is what visitors see.</span><a href={home}>Back to my shelf</a></div>
    : !userId
    ? <div className="pubbar"><span>Like what you see?</span><a href={home}>Make your own shelf</a></div>
    : null
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

  if (pub.shared === false) {
    return (
      <>
        {banner}{top}
        <div className="wrap">
          <div className="hero" style={{ padding: 0 }}>
            <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: LIGHTS }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="title" style={{ margin: 0, minWidth: 0 }}>{pub.shelf_name}</h1>
              {userId && !mine && pub.owner_id && (
                <button className={'followbtn' + (following ? ' on' : '')} onClick={toggleFollow} aria-label={following ? 'Unfollow' : 'Follow'} title={following ? 'Following' : 'Follow'}>
                  {following ? <Check size={18} /> : <Plus size={20} />}
                </button>
              )}
            </div>
            <p className="greet">This collector has not shared their plants yet.{userId && !mine ? ' Follow them to see them when they do.' : ''}</p>
          </div>
        </div>
      </>
    )
  }
  const searching = !!q
  const fav: FavApi | undefined = userId ? { has: (p) => favs.has(String((p as { uid?: string }).uid)), toggle: (p) => toggleHeart(String((p as { uid?: string }).uid)) } : undefined
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
      head = (<><button className="link back" onClick={() => setGsel(null)}>← All genus</button><h2 className="gtitle">{gsel}</h2></>)
    }
    sub = sortList(sub, 'name')
    body = <>{head}{!sub.length ? <p className="mut">Nothing matches.</p> : view === 'cards'
      ? <CardGrid list={sub} all={plants} photos={photos} onOpen={open} readOnly fav={fav} />
      : <IllusShelf list={sub} photos={photos} onOpen={open} fav={fav} />}</>
  }
  const modalPlant = plants.find((p) => p.id === modal) as (typeof plants)[number] & { uid?: string } | undefined

  return (
    <>
      {banner}{top}
      <div className="wrap">
        <div className="hero" style={{ padding: 0 }}>
          <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: LIGHTS }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="title" style={{ margin: 0, minWidth: 0 }}>{pub.shelf_name}</h1>
            {userId && !mine && pub.owner_id && (
              <button className={'followbtn' + (following ? ' on' : '')} onClick={toggleFollow} aria-label={following ? 'Unfollow' : 'Follow'} title={following ? 'Following' : 'Follow'}>
                {following ? <Check size={18} /> : <Plus size={20} />}
              </button>
            )}
          </div>
          <p className="greet">{plants.length} plants, {genusGroups(plants).length} genus. Tap any plant to see more.</p>
        </div>
        <div className="seg">
          {(['shelf', 'cards'] as const).map((v) => <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        </div>
        <div className="row" style={{ margin: '10px 0 4px' }}>
          <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, margin: 0 }} />
        </div>
        {body}
      </div>
      {modalPlant && <PublicModal p={modalPlant} pub={pub} onClose={() => setModal(null)} faved={favs.has(String(modalPlant.uid))} onHeart={userId && modalPlant.uid ? () => toggleHeart(String(modalPlant.uid)) : undefined} />}
    </>
  )
}
