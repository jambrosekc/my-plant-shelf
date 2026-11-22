import type { Plant } from './types'

export const STAGES = ['TC', 'Plug', 'Starter', 'Established', 'Large', 'Tree', 'Rehab', 'Corm', 'Cutting']
export const WHERE: [string, string][] = [
  ['ship', 'Shipping'],
  ['print', 'Needs label'],
  ['labeled', 'Labeled'],
  ['missing', "Can't find"],
  ['refunded', 'Refunded'],
]

export type Where = 'ship' | 'print' | 'labeled' | 'missing' | 'refunded'

export function whereOf(p: Plant): Where {
  if (p.refunded) return 'refunded'
  if (p.shipping) return 'ship'
  if (!p.have_it) return 'missing'
  return p.labeled ? 'labeled' : 'print' // a plant you have that has no label yet needs one
}

export function wherePatch(w: string): Partial<Plant> {
  return {
    refunded: w === 'refunded',
    shipping: w === 'ship',
    have_it: w === 'print' || w === 'labeled',
    labeled: w === 'labeled',
    to_print: w === 'print',
  }
}

export const sellOf = (p: Plant) => (p.sold ? 'sold' : p.for_sale ? 'sale' : 'none')
export const gkey = (p: Plant) => p.genus || 'Other'
export const stageRank = (s: string | null) => {
  const i = STAGES.indexOf(s ?? '')
  return i < 0 ? 99 : i
}

export type SortBy = 'name' | 'seller' | 'stage' | 'newest'

// Purchase dates are text like 10/07/26, 10/07/2026 or 2026-10-07. Turns one into a sortable number (0 = no date).
export function dateNum(p: Plant): number {
  const s = String((p as unknown as Record<string, unknown>)['purchase_date'] ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return +m[1] * 10000 + +m[2] * 100 + +m[3]
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) return (+m[3] < 100 ? 2000 + +m[3] : +m[3]) * 10000 + +m[1] * 100 + +m[2]
  return 0
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Headings for the shelf and card views: they follow whatever the Sort menu says.
// Items inside a section keep the order they were given (already sorted by sortList).
export function sections(list: Plant[], sortBy: SortBy): { k: string; items: Plant[] }[] {
  const keyOf = (p: Plant): string => {
    if (sortBy === 'seller') return p.seller_name || 'Seller not set'
    if (sortBy === 'stage') return p.purchase_stage || 'Stage not set'
    if (sortBy === 'newest') {
      const d = dateNum(p)
      return d ? `${MONTHS[Math.floor((d % 10000) / 100) - 1] ?? ''} ${Math.floor(d / 10000)}` : 'No date'
    }
    return p.genus || 'Other'
  }
  const m: Record<string, Plant[]> = {}
  const order: string[] = []
  list.forEach((p) => { const k = keyOf(p); if (!m[k]) { m[k] = []; order.push(k) } m[k].push(p) })
  const unset = ['Other', 'Seller not set', 'Stage not set', 'No date']
  if (sortBy === 'newest') return order.map((k) => ({ k, items: m[k] })) // already newest first
  const rank = (k: string) => (sortBy === 'stage' ? stageRank(k === 'Stage not set' ? null : k) : 0)
  return order
    .sort((a, b) => (unset.includes(a) ? 1 : 0) - (unset.includes(b) ? 1 : 0) || rank(a) - rank(b) || a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => ({ k, items: m[k] }))
}

export function sortList(list: Plant[], sortBy: SortBy): Plant[] {
  const key: Record<SortBy, (p: Plant) => string | number> = {
    name: (p) => (p.plant_name || '').toLowerCase(),
    seller: (p) => (p.seller_name || 'zzz').toLowerCase(),
    stage: (p) => stageRank(p.purchase_stage),
    newest: (p) => dateNum(p),
  }
  const f = key[sortBy]
  return [...list].sort((a, b) => {
    const x = f(a)
    const y = f(b)
    let r = x < y ? -1 : x > y ? 1 : 0
    if (sortBy === 'newest') r = (x === 0 ? 1 : 0) - (y === 0 ? 1 : 0) || -r
    return r || ((a.plant_name || '').toLowerCase() < (b.plant_name || '').toLowerCase() ? -1 : 1)
  })
}

export function genusGroups(list: Plant[]) {
  const m: Record<string, Plant[]> = {}
  list.forEach((p) => (m[gkey(p)] ??= []).push(p))
  return Object.keys(m)
    .sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => ({ k, items: m[k] }))
}

export const repPlant = (items: Plant[]) => items.find((p) => p.have_it) ?? items[0]

export type Filter = 'all' | 'have' | 'labeled' | 'missing' | 'shipping' | 'print' | 'repot' | 'water' | 'sale' | 'sold' | 'refunded'

export function passes(p: Plant, q: string, filter: Filter): boolean {
  if (q) {
    const s = `${p.plant_name} ${p.seller_name || ''} ${p.plant_id || ''} ${p.genus || ''}`.toLowerCase()
    if (!s.includes(q.toLowerCase())) return false
  }
  switch (filter) {
    case 'have': return placeOf(p) === 'have'
    case 'labeled': return whereOf(p) === 'labeled'
    case 'missing': return whereOf(p) === 'missing'
    case 'shipping': return p.shipping && !p.refunded
    case 'refunded': return !!p.refunded
    case 'print': return whereOf(p) === 'print'
    case 'repot': return p.to_repot
    case 'water': return p.to_water
    case 'sale': return p.for_sale && !p.sold
    case 'sold': return p.sold
  }
  return true
}

export function labelNums(plants: Plant[]): Record<string, string> {
  const cnt: Record<string, number> = {}
  const tot: Record<string, number> = {}
  const m: Record<string, string> = {}
  plants.forEach((p) => {
    const k = (p.plant_name || '').toLowerCase()
    tot[k] = (tot[k] || 0) + 1
  })
  plants.forEach((p) => {
    const k = (p.plant_name || '').toLowerCase()
    cnt[k] = (cnt[k] || 0) + 1
    m[p.id] = `${cnt[k]} of ${tot[k]}`
  })
  return m
}

export const haveish = (p: Plant) => p.have_it || p.shipping
export type GroupBy = 'seller' | 'stage' | 'status' | 'label'

export const MEDIA = [
  'Soilless chunky mix', 'Tree fern based mix', 'Sphagnum moss', 'Perlite / pumice mix', 'LECA (semi-hydro)',
  'Water (hydro)', 'Aroid potting mix', 'Potting soil', 'Coco coir', 'Orchid bark mix',
]
export const HUMIDITY: [string, string][] = [
  ['40', 'Ambient (about 40%)'], ['55', 'Moderate (about 55%)'], ['70', 'Higher (about 70%)'], ['85', 'High, enclosed (about 85%)'],
]
export const humidityLabel = (v: unknown) => {
  if (v == null || v === '') return ''
  const hit = HUMIDITY.find((h) => Number(h[0]) === Number(v))
  return hit ? hit[1] : `${v}%`
}

// Two separate questions: where is it (one of three), and, if you have it, its label status (one of three).
export type Place = 'ship' | 'have' | 'missing' | 'refunded'
export type LabelState = 'print' | 'labeled'
export const PLACE: [Place, string][] = [['ship', 'Shipping'], ['have', 'Have it'], ['missing', "Can't find"], ['refunded', 'Refunded']]
export const LABEL: [LabelState, string][] = [['print', 'Needs label'], ['labeled', 'Labeled']]
export const placeOf = (p: Plant): Place => (p.refunded ? 'refunded' : p.shipping ? 'ship' : !p.have_it ? 'missing' : 'have')
export const labelOf = (p: Plant): LabelState => (p.labeled ? 'labeled' : 'print')
export function placePatch(v: string): Partial<Plant> {
  if (v === 'have') return { refunded: false, shipping: false, have_it: true, labeled: false, to_print: true }
  return { refunded: v === 'refunded', shipping: v === 'ship', have_it: false, labeled: false, to_print: false }
}
export const labelPatch = (v: string): Partial<Plant> => ({ labeled: v === 'labeled', to_print: v === 'print' })
