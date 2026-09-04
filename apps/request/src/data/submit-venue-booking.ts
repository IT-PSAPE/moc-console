import { supabase } from '@moc/data/supabase'
import { wakeVenueBookingCreatedNotification } from '@/data/notify-event'
import { workspaceId } from '@/lib/workspace'
import type { VenueBookingFormData, SubmitVenueBookingResult } from '@/types/venue-booking'

export async function submitPublicVenueBooking(data: VenueBookingFormData): Promise<SubmitVenueBookingResult> {
  const { data: result, error } = await supabase.rpc('public_submit_venue_booking', {
    p_workspace_id: workspaceId,
    p_venue_id: data.venueId,
    p_title: data.title,
    p_requested_by: data.requestedBy,
    p_who: data.who,
    p_what: data.what,
    p_when_text: data.whenText,
    p_where_text: data.whereText,
    p_why: data.why,
    p_how: data.how,
    p_slot_starts: data.slotStarts,
    p_notes: data.notes || null,
  })

  if (error) throw new Error(error.message)

  wakeVenueBookingCreatedNotification(result.id, result.tracking_code)

  return {
    id: result.id,
    trackingCode: result.tracking_code,
    title: result.title,
    startsAt: result.starts_at,
    endsAt: result.ends_at,
  }
}
