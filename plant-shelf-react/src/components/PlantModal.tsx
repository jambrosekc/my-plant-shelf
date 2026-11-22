import { useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Camera, Star, Trash2, X } from 'lucide-react'
import type { Plant, PlantPhoto } from '../lib/types'
import { LABEL, PLACE, STAGES, humidityLabel, labelOf, labelPatch, placeOf, placePatch, sellOf } from '../lib/helpers'
import { photoUrl } from '../lib/supabase'
import { HumiditySelect, MediumSelect } from './Selects'
import PhotoCropper from './PhotoCropper'

interface Props {
  plant: Plant
  photos: PlantPhoto[]
  onClose: () => void
  onPatch: (id: string, c: Partial<Plant>) => void
  onDelete: (id: string) => void
  onAddPhoto: (plantId: string, blob: Blob) => Promise<string>
  onDeletePhoto: (plantId: string, id: string) => void
  onMakeCover: (plantId: string, id: string) => void
}

const FIELDS: [keyof Plant & string, string, 'text' | 'number'][] = [
  ['plant_name', 'Plant name', 'text'], ['genus', 'Genus', 'text'], ['seller_name', 'Seller', 'text'],
  ['sourced_from', 'Where bought', 'text'], ['purchase_price', 'Paid ($)', 'number'],
  ['soil_medium', 'Medium', 'text'], ['humidity', 'Humidity', 'number'], ['asking_price', 'Asking price ($)', 'number'],
]

function Gallery({ photos, plantId, onDelete, onCover }: { photos: PlantPhoto[]; plantId: string; onDelete: (p: string, id: string) => void; onCover: (p: string, id: string) => void }) {
  const [ref] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' })
  if (!photos.length) return null
  return (
    <div className="embla" ref={ref} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {photos.map((x, i) => (
          <div key={x.id} style={{ flex: '0 0 auto', position: 'relative' }}>
            <img src={photoUrl(x.path)} alt="" loading="lazy" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
            {i === 0 && <small style={{ position: 'absolute', left: 6, top: 6, background: 'var(--sage)', color: 'var(--on)', borderRadius: 6, padding: '1px 6px', fontSize: 11 }}>Cover</small>}
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              {i > 0 && <button className="chip" onClick={() => onCover(plantId, x.id)}><Star size={12} /> Cover</button>}
              <button className="chip" onClick={() => confirm('Delete this photo?') && onDelete(plantId, x.id)}><Trash2 size={12} /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlantModal({ plant: p, photos, onClose, onPatch, onDelete, onAddPhoto, onDeletePhoto, onMakeCover }: Props) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [queue, setQueue] = useState<File[]>([])
  const [msg, setMsg] = useState('')

  function startEdit() {
    const d: Record<string, string> = { notes: p.notes ?? '', purchase_stage: p.purchase_stage ?? '' }
    FIELDS.forEach(([k]) => (d[k] = p[k] == null ? '' : String(p[k])))
    setDraft(d)
    setEdit(true)
  }

  function saveEdit(): boolean {
    if (!draft.plant_name.trim()) { setMsg('Plant name cannot be empty'); return false }
    const patch: Record<string, unknown> = {}
    FIELDS.forEach(([k, , t]) => {
      const v = draft[k].trim()
      patch[k] = k === 'plant_name' ? v : t === 'number' ? (v === '' || isNaN(Number(v)) ? null : Number(v)) : v || null
    })
    patch.purchase_stage = draft.purchase_stage || null
    patch.notes = draft.notes.trim() || null
    onPatch(p.id, patch as Partial<Plant>)
    setEdit(false)
    setMsg('')
    return true
  }

  // While editing, closing saves what you typed so nothing is lost; otherwise there is nothing pending.
  function closeSheet() {
    if (edit && !saveEdit()) return
    onClose()
  }

  async function cropped(blob: Blob) {
    const err = await onAddPhoto(p.id, blob)
    setMsg(err ? `Upload failed: ${err}` : '')
    setQueue((q) => q.slice(1))
  }

  const chip = (on: boolean, label: string, click: () => void) => (
    <button key={label} className={'chip' + (on ? ' on' : '')} onClick={click}>{label}</button>
  )
  const kv = (l: string, v: unknown) => (
    <>
      <dt>{l}</dt>
      <dd>{v == null || v === '' ? <span className="mut">-</span> : String(v)}</dd>
    </>
  )
  const stages = p.purchase_stage && !STAGES.includes(p.purchase_stage) ? [...STAGES, p.purchase_stage] : STAGES

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && !edit && onClose()}>
      <div className="msheet">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{p.plant_name}</h3>
          <button className="link" style={{ color: 'var(--sage-d)' }} onClick={closeSheet}><X size={16} /> {edit ? 'Save & close' : 'Done'}</button>
        </div>
        <div className="mut">{p.plant_id}</div>

        <div className="sec">Photos</div>
        <Gallery photos={photos} plantId={p.id} onDelete={onDeletePhoto} onCover={onMakeCover} />
        <label className="btn alt" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', margin: '6px 0' }}>
          <Camera size={16} /> Add photos
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { setQueue(Array.from(e.target.files ?? [])); e.target.value = '' }} />
        </label>
        {msg && <p className="mut">{msg}</p>}

        <div className="sec">Where is it?</div>
        <div className="flags">{PLACE.map((w) => chip(placeOf(p) === w[0], w[1], () => onPatch(p.id, placePatch(w[0]))))}</div>
        {placeOf(p) === 'have' && (
          <>
            <div className="sec">Label</div>
            <div className="flags">{LABEL.map((w) => chip(labelOf(p) === w[0], w[1], () => onPatch(p.id, labelPatch(w[0]))))}</div>
          </>
        )}
        <div className="sec">Care</div>
        <div className="flags">
          {chip(p.to_repot, 'Needs repot', () => onPatch(p.id, { to_repot: !p.to_repot }))}
          {chip(p.to_water, 'Needs water', () => onPatch(p.id, { to_water: !p.to_water }))}
        </div>
        <div className="sec">Selling</div>
        <div className="flags">
          {([['none', 'Not selling'], ['sale', 'For sale'], ['sold', 'Sold']] as const).map(([k, l]) =>
            chip(sellOf(p) === k, l, () => onPatch(p.id, { for_sale: k === 'sale', sold: k === 'sold' })))}
        </div>

        <div className="sec">Details</div>
        {edit ? (
          <>
            <div className="grid2">
              {FIELDS.slice(0, 2).map(([k, l, t]) => (
                <div key={k}><label>{l}</label><input type={t} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></div>
              ))}
              <div>
                <label>Stage</label>
                <select value={draft.purchase_stage} onChange={(e) => setDraft({ ...draft, purchase_stage: e.target.value })}>
                  <option value="">Stage</option>
                  {stages.map((s) => <option key={s} value={s}>{s === 'TC' ? 'TC (tissue culture)' : s}</option>)}
                </select>
              </div>
              {FIELDS.slice(2).map(([k, l, t]) => (
                <div key={k}>
                  <label>{l}</label>
                  {k === 'soil_medium' ? <MediumSelect value={draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} />
                    : k === 'humidity' ? <HumiditySelect value={draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} />
                    : <input type={t} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />}
                </div>
              ))}
            </div>
            <div className="sec">Notes</div>
            <textarea className="notes-edit" value={draft.notes} placeholder="Care notes, where it came from, anything to remember..."
              onChange={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; setDraft({ ...draft, notes: e.target.value }) }}
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 220) + 'px' } }} />
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={saveEdit}>Save changes</button>
              <button className="btn alt" onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <dl className="kv">
              {kv('Genus', p.genus)}{kv('Stage', p.purchase_stage)}{kv('Seller', p.seller_name)}{kv('Where bought', p.sourced_from)}
              {kv('Paid', p.purchase_price == null ? '' : '$' + p.purchase_price)}{kv('Medium', p.soil_medium)}{kv('Humidity', humidityLabel(p.humidity))}
              {kv('Asking price', p.asking_price == null ? '' : '$' + p.asking_price)}
            </dl>
            <div className="sec">Notes</div>
            {p.notes ? <div className="notes-read">{p.notes}</div> : <p className="mut">No notes yet.</p>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={startEdit}>Edit details</button>
              <button className="btn bad" onClick={() => confirm('Delete this plant?') && (onDelete(p.id), onClose())}>Delete</button>
            </div>
          </>
        )}
      </div>
      {queue[0] && <PhotoCropper key={queue[0].name + queue.length} file={queue[0]} remaining={queue.length - 1} onDone={cropped} onCancel={() => setQueue([])} />}
    </div>
  )
}
