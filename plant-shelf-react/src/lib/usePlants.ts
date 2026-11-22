import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { newPhotoPath } from './image'
import { BOOLS } from './importer'
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

  async function addPlants(rows: Record<string, unknown>[]) {
    const clean = rows.map((r) => {
      const o = { ...r }
      BOOLS.forEach((k) => { if (o[k] !== true) o[k] = false })
      return o
    })
    let done = 0
    const ids: string[] = []
    for (let i = 0; i < clean.length; i += 200) {
      const r = await supabase.from('plants').insert(clean.slice(i, i + 200)).select()
      if (r.error) return { error: r.error.message, done, ids }
      done += r.data?.length ?? 0
      ;(r.data ?? []).forEach((x) => ids.push(String((x as { id: string }).id)))
    }
    await load()
    return { error: '', done, ids }
  }

  async function remove(id: string) {
    const ph = photos[id] ?? []
    if (ph.length) await supabase.storage.from('plant-photos').remove(ph.map((x) => x.path))
    const r = await supabase.from('plants').delete().eq('id', id)
    if (r.error) return setError(r.error.message)
    setPlants((l) => l.filter((p) => p.id !== id))
    setPhotos((m) => {
      const n = { ...m }
      delete n[id]
      return n
    })
  }

  async function removeMany(ids: string[]) {
    const paths = ids.flatMap((id) => (photos[id] ?? []).map((x) => x.path))
    for (let i = 0; i < paths.length; i += 100) await supabase.storage.from('plant-photos').remove(paths.slice(i, i + 100))
    for (let i = 0; i < ids.length; i += 100) {
      const r = await supabase.from('plants').delete().in('id', ids.slice(i, i + 100))
      if (r.error) { setError(r.error.message); await load(); return r.error.message }
    }
    const gone = new Set(ids)
    setPlants((l) => l.filter((p) => !gone.has(p.id)))
    setPhotos((m) => Object.fromEntries(Object.entries(m).filter(([k]) => !gone.has(k))))
    return ''
  }

  async function patchMany(ids: string[], changes: Partial<Plant>) {
    const set = new Set(ids)
    const before = plants
    setPlants((l) => l.map((p) => (set.has(p.id) ? { ...p, ...changes } : p)))
    for (let i = 0; i < ids.length; i += 100) {
      const r = await supabase.from('plants').update(changes).in('id', ids.slice(i, i + 100))
      if (r.error) { setPlants(before); setError(r.error.message); return r.error.message }
    }
    return ''
  }

  async function addPhoto(plantId: string, userId: string, blob: Blob) {
    const path = newPhotoPath(userId, plantId)
    const up = await supabase.storage.from('plant-photos').upload(path, blob, { contentType: 'image/jpeg' })
    if (up.error) return up.error.message
    const list = photos[plantId] ?? []
    const position = list.length ? Math.max(...list.map((x) => x.position)) + 1 : 0
    const ins = await supabase.from('plant_photos').insert([{ plant_id: plantId, path, position }]).select()
    if (ins.error) return ins.error.message
    setPhotos((m) => ({ ...m, [plantId]: [...(m[plantId] ?? []), ...(ins.data as PlantPhoto[])] }))
    return ''
  }

  async function deletePhoto(plantId: string, id: string) {
    const x = (photos[plantId] ?? []).find((y) => y.id === id)
    if (!x) return
    await supabase.storage.from('plant-photos').remove([x.path])
    const r = await supabase.from('plant_photos').delete().eq('id', id)
    if (r.error) return setError(r.error.message)
    setPhotos((m) => ({ ...m, [plantId]: (m[plantId] ?? []).filter((y) => y.id !== id) }))
  }

  async function makeCover(plantId: string, id: string) {
    const list = photos[plantId] ?? []
    const min = Math.min(...list.map((y) => y.position))
    const r = await supabase.from('plant_photos').update({ position: min - 1 }).eq('id', id)
    if (r.error) return setError(r.error.message)
    setPhotos((m) => ({
      ...m,
      [plantId]: (m[plantId] ?? []).map((y) => (y.id === id ? { ...y, position: min - 1 } : y)).sort((a, b) => a.position - b.position),
    }))
  }

  return { plants, photos, loading, error, reload: load, patch, addPlants, remove, removeMany, patchMany, addPhoto, deletePhoto, makeCover }
}
