import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { VENUE_BOOKING_SELECT, mapVenueBookingRow, type VenueBookingRow } from "./map-venue-booking";
import type { VenueBooking } from "@moc/types/venues";

function selectVenueBookings(workspaceId: string) {
  return supabase
    .from("venue_bookings")
    .select(VENUE_BOOKING_SELECT)
    .eq("workspace_id", workspaceId);
}

/**
 * Every venue booking for the workspace — booked, in progress, completed and
 * cancelled alike. The console has no archived split like requests: the
 * reader-facing phase is derived (see deriveVenueBookingPhase), so filtering
 * by phase happens client-side against this one list.
 */
export async function fetchVenueBookings(workspaceId?: string): Promise<VenueBooking[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await selectVenueBookings(resolvedWorkspaceId)
    .order("starts_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as VenueBookingRow[]).map(mapVenueBookingRow);
}

export async function fetchVenueBookingById(id: string, workspaceId?: string): Promise<VenueBooking | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await selectVenueBookings(resolvedWorkspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapVenueBookingRow(data as unknown as VenueBookingRow) : undefined;
}
