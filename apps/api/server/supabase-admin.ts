import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

export function getSupabaseAdmin(env: Record<string, string | undefined> = process.env): SupabaseClient {
  if (cached) return cached

  const url = env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables")
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
