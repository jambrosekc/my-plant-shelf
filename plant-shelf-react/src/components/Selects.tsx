import { HUMIDITY, MEDIA } from '../lib/helpers'

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
