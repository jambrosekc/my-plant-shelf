import type { Plant } from '../lib/types'
import { WHERE, haveish, labelNums, stageRank, whereOf, wherePatch, type GroupBy } from '../lib/helpers'

const byName = (a: Plant, b: Plant) => ((a.plant_name || '').toLowerCase() < (b.plant_name || '').toLowerCase() ? -1 : 1)
const NA = 'Seller not set'

function Stat({ n, l }: { n: number; l: string }) {
  return <div className="stat"><b>{n}</b><span>{l}</span></div>
}

function Row({ p, nums, onOpen, onPatch }: { p: Plant; nums: Record<string, string>; onOpen: (id: string) => void; onPatch: (id: string, c: Partial<Plant>) => void }) {
  return (
    <div className="plant">
      <div className="top">
        <button className="nm" onClick={() => onOpen(p.id)}>
          <b>{p.plant_name}</b>
          <small>{p.plant_id || ''} · {nums[p.id]}{p.for_sale && !p.sold ? ' · for sale' : ''}{p.sold ? ' · sold' : ''}</small>
        </button>
        <select className={'wsel w-' + whereOf(p)} value={whereOf(p)} onChange={(e) => onPatch(p.id, wherePatch(e.target.value))}>
          {WHERE.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}
        </select>
      </div>
    </div>
  )
}

const WN: Record<string, string> = { missing: "Can't find", ship: 'Shipping', received: 'Received, no label yet', print: 'Needs label printed', labeled: 'Labeled' }
const WO = ['missing', 'ship', 'received', 'print', 'labeled']
const LO = ['Needs label printed', 'Have it, no label yet', 'Labeled', 'Not here yet (shipping or missing)']

export default function ListView({
  all, list, groupBy, setGroupBy, onOpen, onPatch,
}: { all: Plant[]; list: Plant[]; groupBy: GroupBy; setGroupBy: (g: GroupBy) => void; onOpen: (id: string) => void; onPatch: (id: string, c: Partial<Plant>) => void }) {
  const nums = labelNums(all)
  const c = { ship: 0, missing: 0, received: 0, print: 0, labeled: 0 }
  all.forEach((p) => c[whereOf(p)]++)
  const have = c.received + c.print + c.labeled
  const row = (p: Plant) => <Row key={p.id} p={p} nums={nums} onOpen={onOpen} onPatch={onPatch} />

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
        : w === 'labeled' ? 'Labeled' : w === 'print' ? 'Needs label printed' : w === 'received' ? 'Have it, no label yet' : 'Not here yet (shipping or missing)'
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
        <div className="stats"><Stat n={all.length} l="Plants" /><Stat n={have} l="Have it" /><Stat n={c.ship} l="Shipping" /><Stat n={c.missing} l="Can't find" /></div>
        <p className="mut" style={{ margin: '6px 0 10px', textAlign: 'center', fontSize: 12 }}>Have it + Shipping + Can't find = Plants</p>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><Stat n={c.labeled} l="Labeled" /><Stat n={c.print} l="Needs label" /><Stat n={c.received} l="No label yet" /></div>
        <p className="mut" style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 12 }}>Of the ones you have</p>
      </div>
      <div className="ctl">
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
          <option value="seller">Group by: seller</option>
          <option value="stage">Group by: stage</option>
          <option value="status">Group by: status</option>
          <option value="label">Group by: label printed or not</option>
        </select>
      </div>
      {!list.length && <p className="mut">Nothing matches.</p>}
      {groups()}
    </>
  )
}
