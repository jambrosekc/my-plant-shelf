import { useState } from 'react'
import { Printer } from 'lucide-react'
import type { Plant } from '../lib/types'
import { PCOLS, downloadPrintSheet, needsLabel, pickedCols, savePicked } from '../lib/print'

export default function PrintPanel({ plants, onMarkLabeled, flash, slug }: { plants: Plant[]; slug?: string; onMarkLabeled: (ids: string[]) => Promise<string>; flash: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  const [cols, setCols] = useState<string[]>(pickedCols)
  const [mark, setMark] = useState(false)
  const [busy, setBusy] = useState(false)
  const list = needsLabel(plants)
  if (!list.length) return null

  const toggle = (n: string) => {
    const next = cols.includes(n) ? cols.filter((c) => c !== n) : [...cols, n]
    setCols(next)
    savePicked(next)
  }
  async function go() {
    if (!cols.length) return flash('Pick at least one column')
    setBusy(true)
    const n = await downloadPrintSheet(plants, cols, slug)
    if (mark) {
      const e = await onMarkLabeled(list.map((p) => p.id))
      flash(e ? 'Downloaded, but could not mark them labeled: ' + e : `Downloaded and marked ${n} labeled`)
    } else flash(`Downloaded ${n} label${n > 1 ? 's' : ''}`)
    setBusy(false)
  }

  return (
    <div className="card">
      <b>{list.length} label{list.length > 1 ? 's' : ''} waiting to print</b>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => setOpen(!open)}><Printer size={15} /> Download print sheet</button>
      </div>
      {open && (
        <div className="picker">
          <div className="mut" style={{ margin: '8px 0 4px' }}>Columns in the sheet:</div>
          <div className="flags">
            {PCOLS.map(([n]) => (
              <label key={n} className="rad"><input type="checkbox" checked={cols.includes(n)} onChange={() => toggle(n)} /> {n}</label>
            ))}
          </div>
          <label className="rad" style={{ marginTop: 8 }}><input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} /> Mark these as Labeled after downloading</label>
          <div className="row" style={{ marginTop: 10 }}><button className="btn" disabled={busy} onClick={go}>Download Excel</button></div>
        </div>
      )}
    </div>
  )
}
