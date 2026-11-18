import { useState } from 'react'
import { downloadTemplate, parseSheet, type ParseResult } from '../lib/importer'

export default function ImportView({ onImport, done }: { onImport: (rows: Record<string, unknown>[]) => Promise<{ error: string; done: number }>; done: (n: number) => void }) {
  const [state, setState] = useState<ParseResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setMsg('')
    try {
      setState(await parseSheet(await f.arrayBuffer()))
    } catch (x) {
      setState({ error: 'Could not read that file: ' + (x as Error).message })
    }
  }

  async function go() {
    if (!state || !('rows' in state)) return
    setBusy(true)
    const r = await onImport(state.rows)
    setBusy(false)
    if (r.error) setMsg(`Import stopped: ${r.error} (${r.done} saved)`)
    else done(r.done)
  }

  return (
    <>
      <div className="card">
        <h3>Import from Excel</h3>
        <p className="mut">Use the template so the column names match exactly. Only Plant Name is required.</p>
        <div className="row"><button className="btn alt" onClick={downloadTemplate}>Download template</button></div>
        <label>Choose your .xlsx file</label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={pick} />
      </div>
      {state && 'error' in state && <div className="card err">{state.error}</div>}
      {state && 'rows' in state && (
        <div className="card">
          <h3>Preview</h3>
          <p><b>{state.rows.length}</b> plants ready to import.{state.skipped ? ` ${state.skipped} blank rows skipped.` : ''}</p>
          {state.ignored.length > 0 && <p className="mut">Columns not used: {state.ignored.join(', ')}</p>}
          <table>
            <thead><tr><th>Name</th><th>Seller</th><th>Stage</th></tr></thead>
            <tbody>
              {state.rows.slice(0, 8).map((r, i) => (
                <tr key={i}><td>{String(r.plant_name)}</td><td>{String(r.seller_name ?? '')}</td><td>{String(r.purchase_stage ?? '')}</td></tr>
              ))}
            </tbody>
          </table>
          {state.rows.length > 8 && <p className="mut">and {state.rows.length - 8} more</p>}
          {msg && <p className="mut">{msg}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" disabled={busy} onClick={go}>{busy ? 'Importing...' : `Import ${state.rows.length} plants`}</button>
            <button className="btn alt" onClick={() => setState(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}
