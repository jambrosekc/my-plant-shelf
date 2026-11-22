import { useState } from 'react'
import type { Plant } from '../lib/types'
import SellBadge from './SellBadge'
import { HumiditySelect, MediumSelect, PlaceLabel } from './Selects'
import { LABEL, PLACE, STAGES, haveish, labelNums, labelPatch, placeOf, placePatch, stageRank, whereOf, type GroupBy } from '../lib/helpers'

const byName = (a: Plant, b: Plant) => ((a.plant_name || '').toLowerCase() < (b.plant_name || '').toLowerCase() ? -1 : 1)
const NA = 'Seller not set'

function Stat({ n, l }: { n: number; l: string }) {
  return <div className="stat"><b>{n}</b><span>{l}</span></div>
}

function Row({ p, nums, onOpen, onPatch, select, picked, toggle }: { p: Plant; nums: Record<string, string>; onOpen: (id: string) => void; onPatch: (id: string, c: Partial<Plant>) => void; select: boolean; picked: boolean; toggle: (id: string) => void }) {
  return (
    <div className="plant" style={picked ? { outline: '2px solid var(--sage)' } : undefined}>
      <div className="top">
        {select && <input type="checkbox" checked={picked} onChange={() => toggle(p.id)} aria-label={'Select ' + p.plant_name} style={{ width: 22, height: 22, flex: '0 0 auto' }} />}
        <button className="nm" onClick={() => (select ? toggle(p.id) : onOpen(p.id))}>
          <b>{p.plant_name}</b>
          <small>{p.plant_id || ''} · {nums[p.id]} <SellBadge p={p} /></small>
        </button>
        <div style={{ minWidth: 150 }}><PlaceLabel p={p} onPatch={onPatch} /></div>
      </div>
    </div>
  )
}

const WN: Record<string, string> = { missing: "Can't find", ship: 'Shipping', print: 'Needs label', labeled: 'Labeled', refunded: 'Refunded' }
const WO = ['missing', 'ship', 'print', 'labeled', 'refunded']
const LO = ['Needs label', 'Labeled', 'Not here yet (shipping or missing)', 'Refunded']

export default function ListView({
  all, list, groupBy, setGroupBy, onOpen, onPatch, onBulkDelete, onBulkPatch,
}: {
  all: Plant[]; list: Plant[]; groupBy: GroupBy; setGroupBy: (g: GroupBy) => void
  onOpen: (id: string) => void; onPatch: (id: string, c: Partial<Plant>) => void
  onBulkDelete: (ids: string[]) => Promise<string>; onBulkPatch: (ids: string[], c: Partial<Plant>) => Promise<string>
}) {
  const [select, setSelect] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')
  const nums = labelNums(all)
  const shown = new Set(list.map((p) => p.id))
  const picked = [...sel].filter((id) => shown.has(id))
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const exit = () => { setSelect(false); setSel(new Set()); setMsg('') }
  async function bulkDelete() {
    if (!picked.length || !confirm(`Delete ${picked.length} plant${picked.length > 1 ? 's' : ''}? This also deletes their photos and cannot be undone.`)) return
    const e = await onBulkDelete(picked)
    if (e) setMsg('Could not delete: ' + e)
    else exit()
  }
  async function bulkLabel(v: string) {
    const ids = picked.filter((id) => { const p = all.find((x) => x.id === id); return p && placeOf(p) === 'have' })
    if (!ids.length) return setMsg('Labels only apply to plants marked Have it.')
    const e = await onBulkPatch(ids, labelPatch(v))
    const skipped = picked.length - ids.length
    setMsg(e ? 'Could not save: ' + e : `Updated ${ids.length}.` + (skipped ? ` Skipped ${skipped} that are not marked Have it.` : ''))
  }
  async function bulkPatch(c: Partial<Plant>) {
    const e = await onBulkPatch(picked, c)
    setMsg(e ? 'Could not save: ' + e : `Updated ${picked.length} plant${picked.length > 1 ? 's' : ''}`)
  }
  const c = { ship: 0, missing: 0, print: 0, labeled: 0, refunded: 0 }
  all.forEach((p) => c[whereOf(p)]++)
  const have = c.print + c.labeled
  const row = (p: Plant) => <Row key={p.id} p={p} nums={nums} onOpen={onOpen} onPatch={onPatch} select={select} picked={sel.has(p.id)} toggle={toggle} />

  function groups() {
    if (groupBy === 'seller') {
      const by: Record<string, Plant[]> = {}
      list.forEach((p) => (by[p.seller_name || NA] ??= []).push(p))
      const sellers = Object.keys(by).sort((a, b) => (a === NA ? 1 : b === NA ? -1 : a.toLowerCase() < b.toLowerCase() ? -1 : 1))
      return sellers.map((s) => {
        const stages: Record<string, Plant[]> = {}
        by[s].forEach((p) => (stages[p.purchase_stage || 'Stage not set'] ??= []).push(p))
        return (
          <div key={s}>
            <div className="seller"><span>{s}</span><span className="mut">{by[s].filter(haveish).length} / {by[s].length}</span></div>
            {Object.keys(stages).sort((a, b) => stageRank(a) - stageRank(b) || (a < b ? -1 : 1)).map((g) => (
              <div key={g}><div className="stage">{g}</div>{stages[g].sort(byName).map(row)}</div>
            ))}
          </div>
        )
      })
    }
    const g: Record<string, Plant[]> = {}
    list.forEach((p) => {
      const w = whereOf(p)
      const k = groupBy === 'stage' ? p.purchase_stage || 'Stage not set'
        : groupBy === 'status' ? WN[w]
        : w === 'labeled' ? 'Labeled' : w === 'print' ? 'Needs label' : w === 'refunded' ? 'Refunded' : 'Not here yet (shipping or missing)'
      ;(g[k] ??= []).push(p)
    })
    const rank = (k: string) =>
      groupBy === 'stage' ? (k === 'Stage not set' ? 999 : stageRank(k))
        : groupBy === 'status' ? WO.indexOf(Object.keys(WN).find((x) => WN[x] === k) ?? '')
        : LO.indexOf(k)
    return Object.keys(g).sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1)).map((k) => (
      <div key={k}>
        <div className="seller"><span>{k}</span><span className="mut">{g[k].length}</span></div>
        {g[k].sort(byName).map(row)}
      </div>
    ))
  }

  return (
    <>
      <div className="card">
        <div className="stats"><Stat n={all.length} l="Plants" /><Stat n={c.ship} l="Shipping" /><Stat n={have} l="Have it" /><Stat n={c.missing} l="Can't find" />{c.refunded > 0 && <Stat n={c.refunded} l="Refunded" />}</div>
        <p className="mut" style={{ margin: '6px 0 10px', textAlign: 'center', fontSize: 12 }}>Shipping + Have it + Can't find = Plants</p>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}><Stat n={c.print} l="Needs label" /><Stat n={c.labeled} l="Labeled" /></div>
        <p className="mut" style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 12 }}>Of the ones you have</p>
      </div>
      <div className="ctl">
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
          <option value="seller">Group by: seller</option>
          <option value="stage">Group by: stage</option>
          <option value="status">Group by: status</option>
          <option value="label">Group by: label printed or not</option>
        </select>
        {select
          ? <button className="chip" onClick={exit}>Done selecting</button>
          : <button className="chip" onClick={() => setSelect(true)}>Select</button>}
      </div>
      {select && (
        <div className="card" style={{ position: 'sticky', top: 52, zIndex: 5 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{picked.length} selected</b>
            <span className="row">
              <button className="chip" onClick={() => setSel(new Set(list.map((p) => p.id)))}>Select all {list.length} shown</button>
              <button className="chip" onClick={() => setSel(new Set())}>Clear</button>
            </span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <select disabled={!picked.length} value="" onChange={(e) => e.target.value && bulkPatch(placePatch(e.target.value))}>
              <option value="">Set where...</option>
              {PLACE.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}
            </select>
            <select disabled={!picked.length} value="" onChange={(e) => e.target.value && bulkLabel(e.target.value)}>
              <option value="">Set label...</option>
              {LABEL.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}
            </select>
            <select disabled={!picked.length} value="" onChange={(e) => e.target.value && bulkPatch({ purchase_stage: e.target.value })}>
              <option value="">Set stage...</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <MediumSelect disabled={!picked.length} value="" blank="Set medium..." onChange={(v) => v && bulkPatch({ soil_medium: v })} />
            <HumiditySelect disabled={!picked.length} value="" blank="Set humidity..." onChange={(v) => v && bulkPatch({ humidity: Number(v) })} />
            <select disabled={!picked.length} value="" onChange={(e) => e.target.value && bulkPatch({ for_sale: e.target.value === 'sale', sold: e.target.value === 'sold' })}>
              <option value="">Set selling...</option>
              <option value="none">Not selling</option><option value="sale">For sale</option><option value="sold">Sold</option>
            </select>
            <button className="btn bad" disabled={!picked.length} onClick={bulkDelete}>Delete selected</button>
          </div>
          {msg && <p className="mut" style={{ margin: '6px 0 0' }}>{msg}</p>}
          <p className="mut" style={{ margin: '6px 0 0', fontSize: 12 }}>"Select all" only picks the plants currently shown, so use search or Filter first to narrow the list.</p>
        </div>
      )}
      {!list.length && <p className="mut">Nothing matches.</p>}
      {groups()}
    </>
  )
}
