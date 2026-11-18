import { photoUrl } from '../lib/supabase'
import { plantSVG } from '../lib/art'
import type { Plant, PlantPhoto } from '../lib/types'

// Shows the cover photo if there is one, otherwise the drawn plant.
export default function PlantArt({ p, photos }: { p: Plant; photos: Record<string, PlantPhoto[]> }) {
  const cover = photos[p.id]?.[0]
  if (cover) return <img className="pimg" loading="lazy" alt={p.plant_name} src={photoUrl(cover.path)} />
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: plantSVG(p) }} />
}
