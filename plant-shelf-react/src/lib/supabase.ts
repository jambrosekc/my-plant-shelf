import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://hfdrqhtwfmktyqdvfjyv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_A99g8FcIytThC-bBf2lSeQ_4J5uNdAH'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const photoUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/plant-photos/${path}`
