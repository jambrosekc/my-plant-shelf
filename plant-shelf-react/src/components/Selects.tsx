import { HUMIDITY, MEDIA, WHERE, whereOf, wherePatch } from '../lib/helpers'
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

// Where is it: Shipping, Needs label, Labeled or Can't find.
export function PlaceLabel({ p, onPatch }: { p: Plant; onPatch: (id: string, c: Partial<Plant>) => void }) {
  return (
    <select className={'wsel w-' + whereOf(p)} aria-label="Where is it" value={whereOf(p)} onChange={(e) => onPatch(p.id, wherePatch(e.target.value))}>
      {WHERE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
