import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong web/.env.local')
}

// Chỉ dùng anon key ở client; mọi quyền đọc/ghi được RLS kiểm soát.
export const supabase = createClient(url, anonKey)
