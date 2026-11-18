import { HUMIDITY, LABEL, MEDIA, PLACE, labelOf, labelPatch, placeOf, placePatch, whereOf } from '../lib/helpers'
import type { Plant } from '../lib/types'

interface P { value: string; onChange: (v: string) => void; blank?: string; className?: string; disabled?: boolean }

export function MediumSelect({ value, onChange, blank = 'Medium', ...rest }: P) {
  const opts = value && !MEDIA.includes(value) ? [...MEDIA, value] : MEDIA
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{blank}</option>
      {opts.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  )
}

export function HumiditySelect({ value, onChange, blank = 'Humidity', ...rest }: P) {
  const known = HUMIDITY.some((h) => Number(h[0]) === Number(value))
  return (
    <select value={value === '' ? '' : known ? String(Number(value)) : value} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{blank}</option>
      {HUMIDITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      {value !== '' && !known && <option value={value}>{value}%</option>}
    </select>
  )
}

// Where it is, plus (only when you have it) its label status.
export function PlaceLabel({ p, onPatch }: { p: Plant; onPatch: (id: string, c: Partial<Plant>) => void }) {
  const have = placeOf(p) === 'have'
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select className={'wsel w-' + whereOf(p)} aria-label="Where is it" value={placeOf(p)} onChange={(e) => onPatch(p.id, placePatch(e.target.value))} style={{ flex: 1, minWidth: 0 }}>
        {PLACE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {have && (
        <select className={'wsel w-' + whereOf(p)} aria-label="Label" value={labelOf(p)} onChange={(e) => onPatch(p.id, labelPatch(e.target.value))} style={{ flex: 1, minWidth: 0 }}>
          {LABEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </div>
  )
}
