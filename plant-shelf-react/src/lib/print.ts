import type { Plant } from './types'
import { labelNums, whereOf } from './helpers'

type Getter = (p: Plant, nums: Record<string, string>, slug?: string) => unknown
// name, how to read it, on by default (the columns the Niimbot label template uses)
export const PCOLS: [string, Getter, boolean][] = [
  ['Name', (p) => p.plant_name, true],
  ['Label #', (p, n) => n[p.id], true],
  ['Seller', (p) => p.seller_name, true],
  ['Date Purchased', (p) => p['purchase_date'], true],
  ['Plant ID', (p) => p.plant_id, true],
  ['QR Link', (p, _n, slug) => (slug && p.plant_id ? `${location.origin}/?shelf=${slug}&plant=${p.plant_id}` : ''), true],
  ['Genus', (p) => p.genus, false],
  ['Stage', (p) => p.purchase_stage, false],
  ['Medium', (p) => p['soil_medium'], false],
  ['Notes', (p) => p.notes, false],
]

export function pickedCols(): string[] {
  let saved: string[] | null = null
  try { saved = JSON.parse(localStorage.getItem('printCols') || 'null') } catch { /* ignore */ }
  // QR Link was added later: switch it on once for people who had already saved their column choices.
  try {
    if (saved && !localStorage.getItem('qrColSeen')) { localStorage.setItem('qrColSeen', '1'); if (!saved.includes('QR Link')) saved = [...saved, 'QR Link'] }
  } catch { /* ignore */ }
  return PCOLS.filter((c) => (saved ? saved.includes(c[0]) : c[2])).map((c) => c[0])
}
export function savePicked(cols: string[]) {
  try { localStorage.setItem('printCols', JSON.stringify(PCOLS.map((c) => c[0]).filter((n) => cols.includes(n)))) } catch { /* ignore */ }
}

// Everything you have that does not have its label yet.
export const needsLabel = (plants: Plant[]) => plants.filter((p) => whereOf(p) === 'print')

export async function downloadPrintSheet(all: Plant[], cols: string[], slug?: string): Promise<number> {
  const list = needsLabel(all)
  if (!list.length) return 0
  const nums = labelNums(all)
  const use = PCOLS.filter((c) => cols.includes(c[0]))
  const aoa = [use.map((c) => c[0]), ...list.map((p) => use.map((c) => { const v = c[1](p, nums, slug); return v == null ? '' : v }))]
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Print Tags')
  XLSX.writeFile(wb, 'plant_labels_to_print.xlsx')
  return list.length
}
