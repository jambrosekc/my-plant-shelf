import type { Plant, PlantPhoto } from '../lib/types'
import { genusGroups, repPlant, labelNums } from '../lib/helpers'
import { PlaceLabel } from './Selects'
import PlantArt from './PlantArt'
import SellBadge from './SellBadge'

type Photos = Record<string, PlantPhoto[]>
function SaleDot({ items }: { items: Plant[] }) {
  const n = items.filter((p) => p.for_sale && !p.sold).length
  if (!n) return null
  return <span className="gsale" title={`${n} of ${items.length} for sale`}><i />{n}/{items.length}</span>
}
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
                <SaleDot items={g.items} />
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
              <SaleDot items={g.items} />
              <span className="gbub">×{g.items.length}</span>
              <PlantArt p={repPlant(g.items)} photos={photos} />
            </div>
            <div className="gfoot"><b>{g.k}</b><span>{g.items.length} plant{g.items.length > 1 ? 's' : ''}{g.items.some((p) => p.for_sale && !p.sold) ? ` · ${g.items.filter((p) => p.for_sale && !p.sold).length} for sale` : ''}</span></div>
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
                <SellBadge p={p} corner />
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
  list, all, photos, onOpen, onWhere, readOnly,
}: { list: Plant[]; all: Plant[]; photos: Photos; onOpen: (id: string) => void; onWhere?: (id: string, patch: Partial<Plant>) => void; readOnly?: boolean }) {
  const nums = labelNums(all)
  return (
    <div className="cardgrid">
      {list.map((p) => (
        <div key={p.id} className={'pcard' + (p.have_it || p.shipping ? '' : ' off')}>
          <SellBadge p={p} corner />
          <button className="pc" onClick={() => onOpen(p.id)}>
            <PlantArt p={p} photos={photos} />
            <b>{p.plant_name}</b>
            <em>{[p.seller_name, p.purchase_stage].filter(Boolean).join(' · ')}</em>
            <em>{readOnly ? (p.shipping && !p.sold ? 'on its way' : '') : `${p.plant_id || ''} · ${nums[p.id]}`}</em>
          </button>
          {readOnly || !onWhere ? null : <PlaceLabel p={p} onPatch={onWhere} />}
        </div>
      ))}
    </div>
  )
}
