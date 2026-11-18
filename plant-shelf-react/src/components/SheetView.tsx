import { useState } from 'react'
import type { Plant } from '../lib/types'
import { HumiditySelect, MediumSelect } from './Selects'
import { STAGES, humidityLabel, WHERE, sellOf, whereOf, wherePatch } from '../lib/helpers'

type Kind = 'ro' | 't' | 'st' | 'w' | 'b' | 's' | 'n' | 'med' | 'hum'
const COLS: [string, string, Kind][] = [
  ['plant_id', 'ID', 'ro'], ['plant_name', 'Name', 't'], ['genus', 'Genus', 't'], ['seller_name', 'Seller', 't'],
  ['purchase_stage', 'Stage', 'st'], ['where', 'Where', 'w'], ['to_repot', 'Repot', 'b'], ['to_water', 'Water', 'b'],
  ['sell', 'Selling', 's'], ['purchase_price', 'Paid $', 'n'], ['soil_medium', 'Medium', 'med'], ['humidity', 'Humidity', 'hum'], ['notes', 'Notes', 't'],
]
const SELL: [string, string][] = [['none', 'Not selling'], ['sale', 'For sale'], ['sold', 'Sold']]

type Draft = Record<string, Record<string, string | boolean>>

export default function SheetView({ list, onPatch }: { list: Plant[]; onPatch: (id: string, c: Partial<Plant>) => void }) {
  const [sort, setSort] = useState('plant_name')
  const [dir, setDir] = useState(1)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<Draft>({})

  const val = (p: Plant, k: string): string | boolean => {
    const d = draft[p.id]?.[k]
    if (d !== undefined) return d
    if (k === 'where') return whereOf(p)
    if (k === 'sell') return sellOf(p)
    if (k === 'to_repot' || k === 'to_water') return !!p[k]
    const v = p[k]
    return v == null ? '' : String(v)
  }
  const set = (id: string, k: string, v: string | boolean) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))

  function sorted() {
    const key = (p: Plant): string | number => {
      const x = sort === 'where' ? whereOf(p) : sort === 'sell' ? sellOf(p) : p[sort]
      if (x == null || x === '') return dir > 0 ? '￿' : ''
      return typeof x === 'string' ? x.toLowerCase() : (x as number)
    }
    return [...list].sort((a, b) => {
      const x = key(a), y = key(b)
      return (x < y ? -1 : x > y ? 1 : 0) * dir
    })
  }

  function saveAll() {
    let n = 0
    list.forEach((p) => {
      const d = draft[p.id]
      if (!d) return
      let patch: Record<string, unknown> = {}
      Object.entries(d).forEach(([k, v]) => {
        if (k === 'where') patch = { ...patch, ...wherePatch(v as string) }
        else if (k === 'sell') patch = { ...patch, for_sale: v === 'sale', sold: v === 'sold' }
        else if (k === 'to_repot' || k === 'to_water') patch[k] = v
        else if (k === 'purchase_price' || k === 'humidity') patch[k] = v === '' || isNaN(Number(v)) ? null : Number(v)
        else if (k === 'plant_name') patch[k] = String(v).trim() || p.plant_name
        else patch[k] = String(v).trim() || null
      })
      const changed: Record<string, unknown> = {}
      Object.keys(patch).forEach((k) => {
        if ((p[k] ?? null) !== (patch[k] ?? null)) changed[k] = patch[k]
      })
      if (Object.keys(changed).length) { onPatch(p.id, changed as Partial<Plant>); n++ }
    })
    setEdit(false)
    setDraft({})
    return n
  }

  const label = (p: Plant, k: string, kind: Kind) => {
    const v = val(p, k)
    if (kind === 'w') return WHERE.find((w) => w[0] === v)?.[1] ?? ''
    if (kind === 's') return SELL.find((w) => w[0] === v)?.[1] ?? ''
    if (kind === 'b') return v ? 'Yes' : ''
    if (kind === 'hum') return humidityLabel(v)
    return String(v)
  }

  return (
    <>
      <div className="sheetbar">
        {edit ? (
          <>
            <button className="btn" onClick={saveAll}>Save all changes</button>
            <button className="btn alt" onClick={() => { setEdit(false); setDraft({}) }}>Cancel</button>
          </>
        ) : (
          <button className="btn" onClick={() => setEdit(true)}>Edit sheet</button>
        )}
      </div>
      <p className="mut">{edit ? 'Editing. Nothing is saved until you tap Save all changes.' : 'Tap a heading to sort.'}</p>
      <div className="sheetwrap">
        <table className="sheet">
          <thead>
            <tr>
              {COLS.map(([k, l]) => (
                <th key={k} onClick={edit ? undefined : () => (sort === k ? setDir(-dir) : (setSort(k), setDir(1)))}>
                  {l}{!edit && sort === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted().map((p) => (
              <tr key={p.id}>
                {COLS.map(([k, , kind]) => {
                  if (kind === 'ro') return <td key={k} className="ro">{p.plant_id || ''}</td>
                  if (!edit) return <td key={k} className={'ro' + (k === 'notes' ? ' notescell' : '')} style={{ color: 'var(--ink)' }}>{label(p, k, kind)}</td>
                  const v = val(p, k)
                  if (kind === 'b') return <td key={k} className="c"><input type="checkbox" checked={!!v} onChange={(e) => set(p.id, k, e.target.checked)} /></td>
                  if (kind === 'st') {
                    const cur = String(v)
                    const opts = cur && !STAGES.includes(cur) ? [...STAGES, cur] : STAGES
                    return <td key={k}><select value={cur} onChange={(e) => set(p.id, k, e.target.value)}><option value="">Stage</option>{opts.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                  }
                  if (kind === 'med') return <td key={k}><MediumSelect value={String(v)} onChange={(x) => set(p.id, k, x)} /></td>
                  if (kind === 'hum') return <td key={k}><HumiditySelect value={String(v)} onChange={(x) => set(p.id, k, x)} /></td>
                  if (kind === 'w') return <td key={k}><select value={String(v)} onChange={(e) => set(p.id, k, e.target.value)}>{WHERE.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}</select></td>
                  if (kind === 's') return <td key={k}><select value={String(v)} onChange={(e) => set(p.id, k, e.target.value)}>{SELL.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}</select></td>
                  if (k === 'notes') return <td key={k} className="notescell"><textarea rows={3} value={String(v)} onChange={(e) => set(p.id, k, e.target.value)} /></td>
                  return <td key={k}><input type={kind === 'n' ? 'number' : 'text'} step={kind === 'n' ? '0.01' : undefined} value={String(v)} onChange={(e) => set(p.id, k, e.target.value)} /></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
