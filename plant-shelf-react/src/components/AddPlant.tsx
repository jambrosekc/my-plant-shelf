import { useState } from 'react'
import type { Plant } from '../lib/types'
import { LABEL, PLACE, STAGES, labelPatch, placePatch } from '../lib/helpers'
import { HumiditySelect, MediumSelect } from './Selects'
import { toNum } from '../lib/importer'

const SELL: [string, string][] = [['none', 'Not selling'], ['sale', 'For sale'], ['sold', 'Sold']]

export default function AddPlant({ onAdd, done }: { onAdd: (rows: Record<string, unknown>[]) => Promise<{ error: string }>; done: (name: string) => void }) {
  const [f, setF] = useState<Record<string, string>>({ where: 'have', label: 'none', sell: 'none' })
  const [repot, setRepot] = useState(false)
  const [water, setWater] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const txt = (k: string, label: string, type = 'text', extra = {}) => (
    <div><label>{label}</label><input type={type} value={f[k] ?? ''} onChange={set(k)} {...extra} /></div>
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const row: Partial<Plant> & Record<string, unknown> = {
      plant_name: (f.name ?? '').trim(),
      genus: f.genus?.trim() || null,
      purchase_stage: f.stage || null,
      seller_name: f.seller?.trim() || null,
      sourced_from: f.src?.trim() || null,
      purchase_date: f.date || null,
      purchase_price: toNum(f.price),
      soil_medium: f.soil?.trim() || null,
      humidity: toNum(f.humidity),
      last_watered: f.water || null,
      to_repot: repot,
      to_water: water,
      asking_price: f.sell === 'sale' ? toNum(f.ask) : null,
      notes: f.notes?.trim() || null,
      ...placePatch(f.where),
      ...(f.where === 'have' ? labelPatch(f.label) : {}),
      for_sale: f.sell === 'sale',
      sold: f.sell === 'sold',
    }
    const r = await onAdd([row])
    setBusy(false)
    if (r.error) setMsg('Could not add: ' + r.error)
    else done(String(row.plant_name))
  }

  const radios = (k: string, opts: [string, string][]) => (
    <div className="flags">
      {opts.map(([v, l]) => (
        <label key={v} className="rad"><input type="radio" name={k} checked={f[k] === v} onChange={() => setF({ ...f, [k]: v })} /> {l}</label>
      ))}
    </div>
  )

  return (
    <div className="card">
      <h3>Add a plant</h3>
      <form onSubmit={submit}>
        <label>Plant name *</label>
        <input type="text" required value={f.name ?? ''} onChange={set('name')} />
        <div className="grid2">
          {txt('genus', 'Genus')}
          <div>
            <label>Stage</label>
            <select value={f.stage ?? ''} onChange={set('stage')}>
              <option value="">Stage</option>
              {STAGES.map((s) => <option key={s} value={s}>{s === 'TC' ? 'TC (tissue culture)' : s}</option>)}
            </select>
          </div>
          {txt('seller', 'Seller')}{txt('src', 'Where bought')}
          {txt('date', 'Date bought', 'date')}{txt('price', 'Paid ($)', 'number', { step: '0.01' })}
          <div><label>Medium</label><MediumSelect value={f.soil ?? ''} onChange={(v) => setF({ ...f, soil: v })} /></div>
          <div><label>Humidity</label><HumiditySelect value={f.humidity ?? ''} onChange={(v) => setF({ ...f, humidity: v })} /></div>
          {txt('water', 'Last watered', 'date')}
        </div>
        <div className="sec">1. Where is it?</div>
        {radios('where', PLACE)}
        {f.where === 'have' && (<><div className="sec">Label</div>{radios('label', LABEL)}</>)}
        <div className="sec">2. Care</div>
        <div className="flags">
          <label className="rad"><input type="checkbox" checked={repot} onChange={(e) => setRepot(e.target.checked)} /> Needs repot</label>
          <label className="rad"><input type="checkbox" checked={water} onChange={(e) => setWater(e.target.checked)} /> Needs water</label>
        </div>
        <div className="sec">3. Selling</div>
        {radios('sell', SELL)}
        {f.sell === 'sale' && txt('ask', 'Asking price ($)', 'number', { step: '0.01' })}
        <label>Notes</label>
        <textarea value={f.notes ?? ''} onChange={set('notes')} />
        {msg && <p className="mut">{msg}</p>}
        <div className="row" style={{ marginTop: 12 }}><button className="btn" type="submit" disabled={busy}>Add plant</button></div>
      </form>
    </div>
  )
}
