import type { Plant } from '../lib/types'
import { LIGHTS, hash } from '../lib/art'
import { gkey, whereOf } from '../lib/helpers'

export default function Hero({ shelf, plants, onPick }: { shelf: string; plants: Plant[]; onPick: (id: string) => void }) {
  const hr = new Date().getHours()
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
  const genera = new Set(plants.map(gkey)).size
  const away = plants.filter((p) => p.shipping).length
  const miss = plants.filter((p) => whereOf(p) === 'missing').length
  const status =
    !away && !miss
      ? 'all home.'
      : [away ? `${away} on the way` : '', miss ? `${miss} can't be found` : ''].filter(Boolean).join(', ') + '.'
  const have = plants.filter((p) => p.have_it)
  let pick: Plant | null = null
  if (have.length) {
    const d = new Date()
    pick = have[hash(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) % have.length]
  }
  return (
    <div className="hero" style={{ padding: 0 }}>
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: LIGHTS }} />
      <h1 className="title">{shelf}</h1>
      <p className="greet">
        {greet}. {plants.length} plants, {genera} genus, {status}
      </p>
      {pick && (
        <button className="pick" onClick={() => onPick(pick!.id)}>
          Today's pick <b>{pick.plant_name}</b>
        </button>
      )}
    </div>
  )
}
