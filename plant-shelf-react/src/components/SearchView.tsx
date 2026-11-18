import { useEffect, useState } from 'react'
import { supabase, photoUrl } from '../lib/supabase'
import type { Plant } from '../lib/types'

interface Shelf { owner_id: string; slug: string; shelf_name: string; plant_count: number }
interface PubPlant { uid: string; plant_name: string; genus: string | null; purchase_stage: string | null; for_sale: boolean; sold: boolean; asking_price: number | null; slug: string; shelf_name: string; photo: string | null }

export default function SearchView({ query, mine, onOpenMine }: { query: string; mine: Plant[]; onOpenMine: (id: string) => void }) {
  const [shelves, setShelves] = useState<Shelf[] | null>(null)
  const [pub, setPub] = useState<PubPlant[] | null>(null)
  const [needSql, setNeedSql] = useState(false)
  const q = query.trim().toLowerCase()

  useEffect(() => {
    supabase.rpc('list_public_shelves').then((r) => { if (!r.error) setShelves((r.data as Shelf[]) ?? []) })
  }, [])
  useEffect(() => {
    if (q.length < 2) { setPub([]); return }
    const t = setTimeout(() => {
      supabase.rpc('search_public_plants', { p_q: q }).then((r) => {
        if (r.error) { setNeedSql(true); setPub([]) } else { setNeedSql(false); setPub((r.data as PubPlant[]) ?? []) }
      })
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const myHits = mine.filter((p) => `${p.plant_name} ${p.genus || ''} ${p.species || ''} ${p.cultivar || ''} ${p.seller_name || ''} ${p.plant_id || ''}`.toLowerCase().includes(q)).slice(0, 30)
  const shelfHits = (shelves ?? []).filter((s) => `${s.shelf_name} ${s.slug}`.toLowerCase().includes(q)).slice(0, 15)
  const none = !myHits.length && !shelfHits.length && pub !== null && !pub.length

  const h = (t: string) => <h3 style={{ margin: '16px 0 6px', fontFamily: 'var(--display)', fontSize: 20 }}>{t}</h3>
  return (
    <div>
      {h('Searching for "' + query.trim() + '"')}
      {myHits.length > 0 && <>
        <div className="sec">In my plants</div>
        {myHits.map((p) => (
          <div className="card" key={p.id} style={{ margin: '6px 0', padding: 10, cursor: 'pointer' }} onClick={() => onOpenMine(p.id)}>
            <b>{p.plant_name}</b> <span className="mut" style={{ fontSize: 13 }}>{[p.genus, p.purchase_stage].filter(Boolean).join(' · ')}</span>
          </div>
        ))}
      </>}
      {shelfHits.length > 0 && <>
        <div className="sec">Shelves</div>
        {shelfHits.map((s) => (
          <a key={s.owner_id} href={`?shelf=${s.slug}`} className="card" style={{ margin: '6px 0', padding: 10, display: 'block', color: 'var(--ink)', textDecoration: 'none' }}>
            <b>{s.shelf_name}</b> <span className="mut" style={{ fontSize: 13 }}>@{s.slug} · {s.plant_count} plants</span>
          </a>
        ))}
      </>}
      {pub && pub.length > 0 && <>
        <div className="sec">On public shelves</div>
        {pub.map((f) => (
          <a key={f.uid} href={`?shelf=${f.slug}&plant=${f.uid}`} className="card" style={{ margin: '6px 0', padding: 10, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ink)', textDecoration: 'none' }}>
            {f.photo && <img alt="" src={photoUrl(f.photo)} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />}
            <span style={{ minWidth: 0 }}>
              <b>{f.plant_name}</b>
              <span className="mut" style={{ display: 'block', fontSize: 13 }}>{[f.genus, f.purchase_stage].filter(Boolean).join(' · ')}{f.for_sale && !f.sold ? ` · For sale${f.asking_price != null ? ' $' + f.asking_price : ''}` : ''} · {f.shelf_name}</span>
            </span>
          </a>
        ))}
      </>}
      {needSql && <p className="mut">Searching other shelves needs one more database update. Run Part 9 from the setup files in Supabase, then reload.</p>}
      {none && !needSql && <p className="mut">Nothing found.</p>}
    </div>
  )
}
