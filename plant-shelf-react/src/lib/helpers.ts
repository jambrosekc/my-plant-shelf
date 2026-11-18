import type { Plant } from './types'

export const STAGES = ['TC', 'Plug', 'Starter', 'Established', 'Large', 'Tree', 'Rehab', 'Corm', 'Cutting']
export const WHERE: [string, string][] = [
  ['ship', 'Shipping'],
  ['received', 'Received'],
  ['print', 'Needs label printed'],
  ['labeled', 'Labeled'],
  ['missing', "Can't find it"],
]

export type Where = 'ship' | 'received' | 'print' | 'labeled' | 'missing'

export function whereOf(p: Plant): Where {
  if (p.shipping) return 'ship'
  if (!p.have_it) return 'missing'
  if (p.labeled) return 'labeled'
  if (p.to_print) return 'print'
  return 'received'
}

export function wherePatch(w: string): Partial<Plant> {
  return {
    shipping: w === 'ship',
    have_it: w === 'received' || w === 'print' || w === 'labeled',
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

export function sortList(list: Plant[], sortBy: SortBy): Plant[] {
  const key: Record<SortBy, (p: Plant) => string | number> = {
    name: (p) => (p.plant_name || '').toLowerCase(),
    seller: (p) => (p.seller_name || 'zzz').toLowerCase(),
    stage: (p) => stageRank(p.purchase_stage),
    newest: (p) => String(p['purchase_date'] ?? ''),
  }
  const f = key[sortBy]
  return [...list].sort((a, b) => {
    const x = f(a)
    const y = f(b)
    let r = x < y ? -1 : x > y ? 1 : 0
    if (sortBy === 'newest') r = -r
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

export type Filter = 'all' | 'labeled' | 'missing' | 'received' | 'shipping' | 'print' | 'repot' | 'water' | 'sale' | 'sold'

export function passes(p: Plant, q: string, filter: Filter): boolean {
  if (q) {
    const s = `${p.plant_name} ${p.seller_name || ''} ${p.plant_id || ''} ${p.genus || ''}`.toLowerCase()
    if (!s.includes(q.toLowerCase())) return false
  }
  switch (filter) {
    case 'labeled': return whereOf(p) === 'labeled'
    case 'missing': return whereOf(p) === 'missing'
    case 'received': return whereOf(p) === 'received'
    case 'shipping': return p.shipping
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
