import type { Plant, PlantPhoto } from '../lib/types'
import { WHERE, genusGroups, repPlant, whereOf, labelNums, wherePatch } from '../lib/helpers'
import PlantArt from './PlantArt'

type Photos = Record<string, PlantPhoto[]>
const HINT = { fontStyle: 'italic', fontFamily: 'var(--display)', fontSize: 20, margin: '14px 0 0' } as const

export function GenusShelf({ list, photos, onOpen }: { list: Plant[]; photos: Photos; onOpen: (g: string) => void }) {
  const gs = genusGroups(list)
  const rows = []
  for (let i = 0; i < gs.length; i += 3) rows.push(gs.slice(i, i + 3))
  return (
    <>
      <p className="mut" style={HINT}>Pick a genus to open its shelf</p>
      {rows.map((row, i) => (
        <div key={i}>
          <div className="grow">
            {row.map((g) => (
              <button key={g.k} className="gpot" onClick={() => onOpen(g.k)}>
                <span className="gbub">×{g.items.length}</span>
                <PlantArt p={repPlant(g.items)} photos={photos} />
                <span className="gname">{g.k}</span>
              </button>
            ))}
          </div>
          <div className="plank" />
        </div>
      ))}
    </>
  )
}

export function GenusCards({ list, photos, onOpen }: { list: Plant[]; photos: Photos; onOpen: (g: string) => void }) {
  return (
    <>
      <p className="mut" style={HINT}>Pick a genus to open its shelf</p>
      <div className="gcards">
        {genusGroups(list).map((g) => (
          <button key={g.k} className="gcard" onClick={() => onOpen(g.k)}>
            <div className="gtop"><span><i /><i /><i /></span><span>GENUS</span></div>
            <div className="gbody">
              <span className="gbub">×{g.items.length}</span>
              <PlantArt p={repPlant(g.items)} photos={photos} />
            </div>
            <div className="gfoot"><b>{g.k}</b><span>{g.items.length} plant{g.items.length > 1 ? 's' : ''}</span></div>
          </button>
        ))}
      </div>
    </>
  )
}

export function IllusShelf({ list, photos, onOpen }: { list: Plant[]; photos: Photos; onOpen: (id: string) => void }) {
  const g: Record<string, Plant[]> = {}
  list.forEach((p) => (g[p.genus || 'Other'] ??= []).push(p))
  return (
    <>
      {Object.keys(g).sort().map((k) => (
        <div className="ishelf" key={k}>
          <h3>{k} <span className="mut">({g[k].length})</span></h3>
          <div className="irow">
            {g[k].map((p) => (
              <div key={p.id} className={'icell' + (p.have_it || p.shipping ? '' : ' off')} onClick={() => onOpen(p.id)}>
                <PlantArt p={p} photos={photos} />
                <b>{p.plant_name}</b>
                <em>{p.shipping ? 'on its way' : p.seller_name || ''}</em>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export function CardGrid({
  list, all, photos, onOpen, onWhere,
}: { list: Plant[]; all: Plant[]; photos: Photos; onOpen: (id: string) => void; onWhere: (id: string, patch: Partial<Plant>) => void }) {
  const nums = labelNums(all)
  return (
    <div className="cardgrid">
      {list.map((p) => (
        <div key={p.id} className={'pcard' + (p.have_it || p.shipping ? '' : ' off')}>
          <button className="pc" onClick={() => onOpen(p.id)}>
            <PlantArt p={p} photos={photos} />
            <b>{p.plant_name}</b>
            <em>{[p.seller_name, p.purchase_stage].filter(Boolean).join(' · ')}</em>
            <em>{p.plant_id || ''} · {nums[p.id]}{p.sold ? ' · sold' : p.for_sale ? ' · for sale' : ''}</em>
          </button>
          <select className={'wsel w-' + whereOf(p)} value={whereOf(p)} onChange={(e) => onWhere(p.id, wherePatch(e.target.value))}>
            {WHERE.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
