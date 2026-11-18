import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase, photoUrl } from '../lib/supabase'

interface Item { uid: string; plant_name: string; genus: string | null; purchase_stage: string | null; for_sale: boolean; sold: boolean; asking_price: number | null; slug: string; shelf_name: string; added: string; photo: string | null }

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : new Date(iso).toLocaleDateString()
}

export default function FeedView({ userId }: { userId: string }) {
  const [following, setFollowing] = useState(true)
  const [items, setItems] = useState<Item[] | null>(null)
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [err, setErr] = useState('')

  useEffect(() => {
    setItems(null)
    supabase.rpc('list_feed', { p_following: following }).then((r) => {
      if (r.error) return setErr('The feed needs one more database update. Run Part 8 from the setup files in Supabase, then reload.')
      setErr('')
      setItems((r.data as Item[]) ?? [])
    })
  }, [following])
  useEffect(() => {
    supabase.from('favorites').select('plant_id').eq('user_id', userId).then((r) => setFavs(new Set((r.data ?? []).map((x) => x.plant_id as string))))
  }, [userId])

  async function heart(uid: string) {
    const was = favs.has(uid)
    setFavs((c) => { const n = new Set(c); if (was) n.delete(uid); else n.add(uid); return n })
    const r = was
      ? await supabase.from('favorites').delete().eq('user_id', userId).eq('plant_id', uid)
      : await supabase.from('favorites').insert({ user_id: userId, plant_id: uid })
    if (r.error) setFavs((c) => { const n = new Set(c); if (was) n.add(uid); else n.delete(uid); return n })
  }

  return (
    <div>
      <h2 className="gtitle" style={{ marginBottom: 4 }}>New plants</h2>
      <p className="mut" style={{ marginTop: 0 }}>The newest plants added to public shelves.</p>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={following ? 'on' : ''} onClick={() => setFollowing(true)}>People I follow</button>
        <button className={!following ? 'on' : ''} onClick={() => setFollowing(false)}>Everyone</button>
      </div>
      {err && <div className="card"><p className="mut">{err}</p></div>}
      {!err && items === null && <p className="mut">Loading...</p>}
      {items && !items.length && <div className="card"><p className="mut">{following ? 'Nothing yet. Follow some shelves from Discover to see their new plants here.' : 'No public plants yet.'}</p></div>}
      {items && items.map((f) => (
        <div className="card" key={f.uid} style={{ margin: '8px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
          {f.photo && <img alt="" src={photoUrl(f.photo)} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, flex: '0 0 auto' }} />}
          <a href={`?shelf=${f.slug}&plant=${f.uid}`} style={{ color: 'var(--ink)', textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <b>{f.plant_name}</b>
            <div className="mut" style={{ fontSize: 13 }}>
              {[f.genus, f.purchase_stage].filter(Boolean).join(' · ')}
              {f.for_sale && !f.sold ? ` · For sale${f.asking_price != null ? ' $' + f.asking_price : ''}` : f.sold ? ' · Sold' : ''}
            </div>
            <div className="mut" style={{ fontSize: 12 }}>{f.shelf_name} (@{f.slug}) · added {ago(f.added)}</div>
          </a>
          <button className="link" onClick={() => heart(f.uid)} aria-label="Favorite" style={{ color: '#c0392b' }}><Heart size={22} fill={favs.has(f.uid) ? '#c0392b' : 'none'} /></button>
        </div>
      ))}
    </div>
  )
}
