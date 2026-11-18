import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { cleanSlug, newSlug, shareLink, type Profile } from '../lib/useProfile'

const row = { display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, color: 'var(--ink)', margin: '12px 0' } as const
const TOGGLES: [keyof Profile, string][] = [
  ['show_seller', 'Seller and where I bought it'],
  ['show_soil', 'Soil / medium (medium, what it likes, pH)'],
  ['show_conditions', 'Conditions (light, temperature, humidity, watering, last watered)'],
  ['show_lineage', 'Where it came from (grown from, lineage)'],
  ['show_notes', 'My notes'],
]

export default function ShareView({ prof, save, error, flash }: { prof: Profile; save: (p: Partial<Profile>) => void; error: string; flash: (m: string) => void }) {
  const [rawSlug, setSlug] = useState(prof.public_slug)
  if (!prof.ready)
    return <div className="card"><h3>Sharing</h3><p className="mut">Sharing needs one more database update. Run Part 3 from the setup files in Supabase, then reload this page.</p></div>

  const link = shareLink(prof.public_slug)
  const check = (k: keyof Profile, label: string) => (
    <label key={k} style={row}><input type="checkbox" checked={!!prof[k]} onChange={(e) => save({ [k]: e.target.checked })} /> {label}</label>
  )
  async function copy() {
    try { await navigator.clipboard.writeText(link); flash('Link copied') } catch { flash('Press and hold the link to copy') }
  }

  return (
    <div className="card">
      <h3>Share my shelf</h3>
      <p className="mut">Your shelf is private. Turn this on to get a link anyone can open without logging in.</p>
      {check('is_public', 'Make my shelf public')}
      {check('show_prices', 'Show what I paid on the public page')}
      {prof.v4 ? (
        <>
          <div className="sec">Also show on each plant's page</div>
          {TOGGLES.map(([k, l]) => check(k, l))}
          {prof.v5 ? check('show_photos', 'My photos') : <p className="mut">To show photos on the public page, run Part 5 from the setup files in Supabase, then reload.</p>}
        </>
      ) : (
        <p className="mut">To choose more things to show (soil, temperature, humidity and so on), run Part 4 from the setup files in Supabase, then reload this page.</p>
      )}
      {error && <p className="msg">{error}</p>}
      {prof.is_public ? (
        <>
          <label>Your public link</label>
          <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn alt" onClick={copy}><Copy size={14} /> Copy link</button>
            <a className="btn alt" href={link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><ExternalLink size={14} /> Open my public page</a>
          </div>
          <label style={{ marginTop: 14 }}>Your username (it becomes your link)</label>
          <div className="row">
            <input type="text" maxLength={30} autoCapitalize="off" autoComplete="off" value={rawSlug} onChange={(e) => setSlug(cleanSlug(e.target.value))} style={{ flex: 1 }} />
            <button className="btn" onClick={() => {
              const slug = rawSlug.replace(/-+$/, '')
              if (slug.length < 3) return flash('Use at least 3 letters or numbers')
              if (slug === prof.public_slug) return flash('That is already your username')
              save({ public_slug: slug })
            }}>Save</button>
          </div>
          <p className="mut">
            3 to 30 letters or numbers. Spaces and symbols are removed. Someone else may already have the one you want.{' '}
            <button className="link" style={{ color: 'var(--sage-d)' }} onClick={() => {
              if (confirm('The old link will stop working. Continue?')) { const n = newSlug(); setSlug(n); save({ public_slug: n }) }
            }}>Use a random link instead</button>
          </p>
          <p className="mut">The public page shows plant names, type, stage, and whether you have it or it is shipping. It also shows for-sale plants with their asking price. Visitors can tap a plant for more. Order numbers are never shown. Seller, soil, conditions, lineage, notes and photos only appear if you switch them on above.</p>
        </>
      ) : (
        <p className="mut">Nothing is visible to anyone but you right now.</p>
      )}
    </div>
  )
}
