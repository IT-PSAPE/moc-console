import { supabase } from '@moc/data/supabase'
import { workspaceId } from '@/lib/workspace'
import type { PublicVenueEvent } from '@moc/types/venues'

export async function fetchPublicVenueEvents(): Promise<PublicVenueEvent[]> {
  const { data, error } = await supabase.rpc('public_list_venue_events', {
    p_workspace_id: workspaceId,
  })

  if (error) throw new Error(error.message)

  return (data ?? []) as PublicVenueEvent[]
}
