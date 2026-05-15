import { supabase } from "@moc/data/supabase"

export async function buildSessionHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) {
    throw new Error("Not authenticated")
  }
  return { "X-MOC-Session": data.session.access_token }
}
