import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase, photoUrl } from '../lib/supabase'

interface Fav { uid: string; plant_name: string; genus: string | null; purchase_stage: string | null; for_sale: boolean; sold: boolean; asking_price: number | null; slug: string; shelf_name: string; photo: string | null }

export default function FavoritesView({ userId }: { userId: string }) {
  const [favs, setFavs] = useState<Fav[] | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.rpc('list_my_favorites').then((r) => {
      if (r.error) return setErr('Favorites needs one more database update. Run Part 7 from the setup files in Supabase, then reload.')
      setFavs((r.data as Fav[]) ?? [])
    })
  }, [])

  async function unheart(f: Fav) {
    setFavs((cur) => cur && cur.filter((x) => x.uid !== f.uid))
    await supabase.from('favorites').delete().eq('user_id', userId).eq('plant_id', f.uid)
  }

  return (
    <div>
      <h2 className="gtitle" style={{ marginBottom: 4 }}>My favorites</h2>
      <p className="mut" style={{ marginTop: 0 }}>Plants you hearted on other people's shelves. Tap one to open it.</p>
      {err && <div className="card"><p className="mut">{err}</p></div>}
      {!err && favs === null && <p className="mut">Loading...</p>}
      {favs && !favs.length && <div className="card"><p className="mut">No favorites yet. Open a shelf from Discover and tap the heart on a plant.</p></div>}
      {favs && favs.map((f) => (
        <div className="card" key={f.uid} style={{ margin: '8px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
          {f.photo && <img alt="" src={photoUrl(f.photo)} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, flex: '0 0 auto' }} />}
          <a href={`?shelf=${f.slug}&plant=${f.uid}`} style={{ color: 'var(--ink)', textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <b>{f.plant_name}</b>
            <div className="mut" style={{ fontSize: 13 }}>
              {[f.genus, f.purchase_stage].filter(Boolean).join(' · ')}
              {f.for_sale && !f.sold ? ` · For sale${f.asking_price != null ? ' $' + f.asking_price : ''}` : f.sold ? ' · Sold' : ''}
            </div>
            <div className="mut" style={{ fontSize: 12 }}>on {f.shelf_name} (@{f.slug})</div>
          </a>
          <button className="link" onClick={() => unheart(f)} aria-label="Remove from favorites" style={{ color: '#c0392b' }}><Heart size={22} fill="#c0392b" /></button>
        </div>
      ))}
    </div>
  )
}
