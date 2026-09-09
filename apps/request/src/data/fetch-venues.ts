import { supabase } from '@moc/data/supabase'
import { workspaceId } from '@/lib/workspace'
import type { PublicVenue } from '@moc/types/venues'

export async function fetchPublicVenues(): Promise<PublicVenue[]> {
  const { data, error } = await supabase.rpc('public_list_venues', {
    p_workspace_id: workspaceId,
  })

  if (error) throw new Error(error.message)

  return (data ?? []) as PublicVenue[]
}
