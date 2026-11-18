import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface Profile {
  ready: boolean // sharing columns exist (Part 3 SQL)
  v4: boolean // per-field toggles exist (Part 4 SQL)
  v5: boolean // photo toggle exists (Part 5 SQL)
  v10: boolean // profile-visible switch exists (Part 10 SQL)
  profile_public: boolean
  is_public: boolean
  show_prices: boolean
  public_slug: string
  show_seller: boolean
  show_soil: boolean
  show_conditions: boolean
  show_lineage: boolean
  show_notes: boolean
  show_photos: boolean
}

const EMPTY: Profile = {
  ready: false, v4: false, v5: false, v10: false, profile_public: true, is_public: false, show_prices: false, public_slug: '',
  show_seller: false, show_soil: false, show_conditions: false, show_lineage: false, show_notes: false, show_photos: false,
}
const V3 = 'is_public,show_prices,public_slug'
const V4 = V3 + ',show_seller,show_soil,show_conditions,show_lineage,show_notes'
const V5 = V4 + ',show_photos'
const V10 = V5 + ',profile_public'

export function useProfile(userId: string | undefined) {
  const [prof, setProf] = useState<Profile>(EMPTY)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    let level = 10
    let r = await supabase.from('profiles').select(V10).eq('id', userId).maybeSingle()
    if (r.error) { level = 5; r = await supabase.from('profiles').select(V5).eq('id', userId).maybeSingle() }
    if (r.error) { level = 4; r = await supabase.from('profiles').select(V4).eq('id', userId).maybeSingle() }
    if (r.error) { level = 3; r = await supabase.from('profiles').select(V3).eq('id', userId).maybeSingle() }
    if (r.error) return setProf(EMPTY)
    const d = (r.data ?? {}) as Record<string, unknown>
    setProf({
      ready: true, v4: level >= 4, v5: level >= 5, v10: level >= 10, profile_public: d.profile_public !== false,
      is_public: !!d.is_public, show_prices: !!d.show_prices, public_slug: String(d.public_slug ?? ''),
      show_seller: !!d.show_seller, show_soil: !!d.show_soil, show_conditions: !!d.show_conditions,
      show_lineage: !!d.show_lineage, show_notes: !!d.show_notes, show_photos: !!d.show_photos,
    })
  }, [userId])

  useEffect(() => { load() }, [load])

  async function save(patch: Partial<Profile>) {
    if (!userId) return
    const before = prof
    setProf({ ...prof, ...patch })
    setError('')
    const r = await supabase.from('profiles').update(patch).eq('id', userId)
    if (r.error) {
      setProf(before)
      setError(/duplicate|unique/i.test(r.error.message) ? 'That username is taken. Try another.' : 'Could not save: ' + r.error.message)
    }
  }
  return { prof, save, error }
}

export const cleanSlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)
export function newSlug() {
  const a = new Uint8Array(6)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => ('0' + b.toString(16)).slice(-2)).join('')
}
export const shareLink = (slug: string) => `${location.origin}/?shelf=${slug}`
