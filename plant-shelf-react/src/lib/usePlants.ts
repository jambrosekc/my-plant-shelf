import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Plant, PlantPhoto } from './types'

export function usePlants(userId: string | undefined) {
  const [plants, setPlants] = useState<Plant[]>([])
  const [photos, setPhotos] = useState<Record<string, PlantPhoto[]>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [p, ph] = await Promise.all([
      supabase.from('plants').select('*').order('created_at', { ascending: true }),
      supabase.from('plant_photos').select('*').order('position', { ascending: true }),
    ])
    if (p.error) setError(p.error.message)
    else setPlants((p.data as Plant[]) ?? [])
    const map: Record<string, PlantPhoto[]> = {}
    ;((ph.data as PlantPhoto[]) ?? []).forEach((x) => (map[x.plant_id] ??= []).push(x))
    setPhotos(map)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function patch(id: string, changes: Partial<Plant>) {
    const before = plants
    setPlants((l) => l.map((p) => (p.id === id ? { ...p, ...changes } : p)))
    const r = await supabase.from('plants').update(changes).eq('id', id)
    if (r.error) {
      setPlants(before)
      setError(r.error.message)
    }
  }

  return { plants, photos, loading, error, reload: load, patch }
}
