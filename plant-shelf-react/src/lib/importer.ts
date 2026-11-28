type Kind = 'text' | 'num' | 'date' | 'bool'
export const COLS: [string, string, Kind][] = [
  ['Plant Name', 'plant_name', 'text'], ['Genus', 'genus', 'text'], ['Species', 'species', 'text'],
  ['Cultivar/Base Form', 'cultivar', 'text'], ['Variant/Variegation', 'variant', 'text'], ['Plant ID', 'plant_id', 'text'],
  ['Seller Name', 'seller_name', 'text'], ['Seller Sourced From', 'sourced_from', 'text'], ['Purchase Date', 'purchase_date', 'date'],
  ['Purchase Price ($)', 'purchase_price', 'num'], ['Order ID', 'order_id', 'text'], ['Purchase Stage', 'purchase_stage', 'text'],
  ['Grown From', 'grown_from', 'text'], ['Generation/Lineage', 'lineage', 'text'],
  ['Soil Likes', 'soil_likes', 'text'], ['pH Level', 'ph', 'text'], ['Light Level', 'light', 'text'], ['Watering Needs', 'watering_needs', 'text'],
  ['Current Soil Medium', 'soil_medium', 'text'], ['Current Temp (F)', 'temp', 'num'], ['Current Humidity (%)', 'humidity', 'num'],
  ['Last Watered', 'last_watered', 'date'], ['Water Every (days)', 'water_every_days', 'num'],
  ['Have It', 'have_it', 'bool'], ['Have It Labeled', 'labeled', 'bool'], ['Shipping', 'shipping', 'bool'], ['Refunded', 'refunded', 'bool'],
  ['To Print', 'to_print', 'bool'], ['To Repot', 'to_repot', 'bool'], ['To Water', 'to_water', 'bool'], ['Notes', 'notes', 'text'],
  ['For Sale', 'for_sale', 'bool'], ['Asking Price ($)', 'asking_price', 'num'], ['Sold', 'sold', 'bool'], ['Sold Date', 'sold_date', 'date'],
  ['Sold Price ($)', 'sold_price', 'num'], ['Sold To / Platform', 'sold_to', 'text'], ['Sale Notes', 'sale_notes', 'text'],
]
const ALIAS: Record<string, string> = { 'Current Temp (°F)': 'Current Temp (F)', 'Inventory Note': 'Notes' }
export const BOOLS = ['have_it', 'labeled', 'shipping', 'refunded', 'to_print', 'to_repot', 'to_water', 'for_sale', 'sold']

const pad = (n: number) => (n < 10 ? '0' : '') + n
export const toBool = (v: unknown) => /^(y|yes|true|1|x)$/i.test(String(v ?? '').trim())
export function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/[$,%\s]|°F/g, ''))
  return isNaN(n) ? null : n
}
export function toDate(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    let y = +m[3]
    if (y < 100) y += 2000
    return `${y}-${pad(+m[1])}-${pad(+m[2])}`
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

export type ParseResult =
  | { error: string }
  | { rows: Record<string, unknown>[]; ignored: string[]; skipped: number }

export async function parseSheet(buf: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })
  const name = wb.SheetNames.includes('Plants') ? 'Plants' : wb.SheetNames[0]
  const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', raw: true })
  if (!data.length) return { error: 'That file is empty.' }
  const head = data[0].map((h) => {
    const t = String(h).trim()
    return ALIAS[t] || t
  })
  const byName = Object.fromEntries(COLS.map((c) => [c[0], c]))
  if (!head.includes('Plant Name'))
    return { error: 'The column "Plant Name" was not found in row 1. Download the template and keep its column names exactly.' }
  const ignored = [...new Set(head.filter((h) => h && !byName[h]))]
  const rows: Record<string, unknown>[] = []
  let skipped = 0
  for (let i = 1; i < data.length; i++) {
    const o: Record<string, unknown> = {}
    head.forEach((h, ci) => {
      const c = byName[h]
      const v = data[i][ci]
      if (!c || v === '' || v == null) return
      o[c[1]] = c[2] === 'bool' ? toBool(v) : c[2] === 'num' ? toNum(v) : c[2] === 'date' ? toDate(v) : String(v).trim()
    })
    if (!o.plant_name || (typeof o.notes === 'string' && /^example row/i.test(o.notes))) {
      skipped++
      continue
    }
    rows.push(o)
  }
  if (!rows.length) return { error: 'No plants found. Is the Plant Name column filled in?' }
  // A row where Have It, Shipping and Refunded are all left blank: treat it as a plant you have.
  rows.forEach((r) => { if (r.have_it == null && r.shipping == null && r.refunded == null) r.have_it = true })
  return { rows, ignored, skipped }
}

export async function downloadTemplate() {
  const XLSX = await import('xlsx')
  const heads = COLS.map((c) => c[0])
  const ex = COLS.map((c) => (c[0] === 'Plant Name' ? 'Alocasia Example' : c[0] === 'Have It' ? 'Yes' : c[0] === 'Notes' ? 'Example row. Delete it before importing' : ''))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([heads, ex]), 'Plants')
  XLSX.writeFile(wb, 'plant_import_template.xlsx')
}
