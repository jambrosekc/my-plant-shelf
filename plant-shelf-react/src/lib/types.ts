export interface Plant {
  id: string
  user_id: string
  plant_id: string | null
  plant_name: string
  genus: string | null
  species: string | null
  cultivar: string | null
  variant: string | null
  seller_name: string | null
  sourced_from: string | null
  purchase_price: number | null
  asking_price: number | null
  purchase_stage: string | null
  have_it: boolean
  labeled: boolean
  shipping: boolean
  to_print: boolean
  to_repot: boolean
  to_water: boolean
  for_sale: boolean
  sold: boolean
  notes: string | null
  created_at: string
  [key: string]: unknown
}

export interface PlantPhoto {
  id: string
  plant_id: string
  path: string
  position: number
  created_at: string
}
