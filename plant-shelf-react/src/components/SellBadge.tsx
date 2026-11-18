import type { Plant } from '../lib/types'

// Colored pill: green = for sale, red = sold. Nothing when the plant is not for sale.
export default function SellBadge({ p, corner }: { p: Plant; corner?: boolean }) {
  if (!p.sold && !(p.for_sale)) return null
  const sold = !!p.sold
  const label = sold ? 'Sold' : 'For sale' + (p.asking_price != null ? ` $${p.asking_price}` : '')
  return <span className={`sbadge ${sold ? 'sold' : 'sale'}${corner ? ' corner' : ''}`}>{label}</span>
}
