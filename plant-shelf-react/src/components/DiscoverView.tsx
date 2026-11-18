import { useEffect, useState } from 'react'
import { Heart, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Shelf { owner_id: string; slug: string; shelf_name: string; plant_count: number; for_sale: number; followers: number; following: boolean }

export default function DiscoverView({ userId, mineSlug }: { userId: string; mineSlug: string }) {
  const [shelves, setShelves] = useState<Shelf[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [onlyFollowing, setOnlyFollowing] = useState(false)

  useEffect(() => {
    supabase.rpc('list_public_shelves').then((r) => {
      if (r.error) return setErr('Discover needs one more database update. Run Part 7 from the setup files in Supabase, then reload.')
      setShelves((r.data as Shelf[]) ?? [])
    })
  }, [])

  async function toggle(s: Shelf) {
    const was = s.following
    setShelves((cur) => cur && cur.map((x) => (x.owner_id === s.owner_id ? { ...x, following: !was, followers: x.followers + (was ? -1 : 1) } : x)))
    const r = was
      ? await supabase.from('follows').delete().eq('follower_id', userId).eq('followed_id', s.owner_id)
      : await supabase.from('follows').insert({ follower_id: userId, followed_id: s.owner_id })
    if (r.error) setShelves((cur) => cur && cur.map((x) => (x.owner_id === s.owner_id ? { ...x, following: was, followers: x.followers + (was ? 1 : -1) } : x)))
  }

  const list = (shelves ?? []).filter((s) => (!onlyFollowing || s.following) && (!q || `${s.shelf_name} ${s.slug}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <div>
      <h2 className="gtitle" style={{ marginBottom: 4 }}>Discover shelves</h2>
      <p className="mut" style={{ marginTop: 0 }}>Public shelves from other collectors. Follow the ones you like.</p>
      {err && <div className="card"><p className="mut">{err}</p></div>}
      {!err && shelves === null && <p className="mut">Loading...</p>}
      {shelves && (
        <>
          <div className="row" style={{ margin: '8px 0' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 13, opacity: 0.6 }} />
              <input type="search" placeholder="Search shelves" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: 0, paddingLeft: 32 }} />
            </div>
          </div>
          <div className="seg" style={{ marginBottom: 10 }}>
            <button className={!onlyFollowing ? 'on' : ''} onClick={() => setOnlyFollowing(false)}>Everyone</button>
            <button className={onlyFollowing ? 'on' : ''} onClick={() => setOnlyFollowing(true)}>Following</button>
          </div>
          {!list.length && <p className="mut">{onlyFollowing ? 'You are not following anyone yet.' : 'No public shelves found.'}</p>}
          {list.map((s) => (
            <div className="card" key={s.owner_id} style={{ margin: '8px 0' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <a href={`?shelf=${s.slug}`} style={{ color: 'var(--ink)', textDecoration: 'none', minWidth: 0 }}>
                  <b style={{ fontFamily: 'var(--display)', fontSize: 21 }}>{s.shelf_name}</b>
                  <div className="mut" style={{ fontSize: 13 }}>@{s.slug} · {s.plant_count} plant{s.plant_count === 1 ? '' : 's'}{s.for_sale ? ` · ${s.for_sale} for sale` : ''} · {s.followers} follower{s.followers === 1 ? '' : 's'}</div>
                </a>
                {s.slug !== mineSlug && (
                  <button className={'btn ' + (s.following ? 'alt' : '')} onClick={() => toggle(s)} style={{ flex: '0 0 auto' }}>
                    {s.following ? 'Following' : 'Follow'}
                  </button>
                )}
                {s.slug === mineSlug && <span className="mut" style={{ fontSize: 13, display: 'flex', gap: 4, alignItems: 'center' }}><Heart size={13} /> You</span>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
