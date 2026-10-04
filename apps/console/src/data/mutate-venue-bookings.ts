import type { VenueBooking } from "@moc/types/venues";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";
import { notifyEntityChanged } from "./notify-event";

export async function cancelVenueBooking(id: string, reason: string): Promise<VenueBooking> {
  const workspaceId = await getCurrentWorkspaceId();
  const booking = await moc.venueBookings.cancel(id, reason, workspaceId);
  notifyEntityChanged("venue_booking", id);
  return booking;
}

export async function restoreVenueBooking(id: string): Promise<VenueBooking> {
  const workspaceId = await getCurrentWorkspaceId();
  const booking = await moc.venueBookings.restore(id, workspaceId);
  notifyEntityChanged("venue_booking", id);
  return booking;
}

export async function approveVenueBooking(id: string): Promise<VenueBooking> {
  const workspaceId = await getCurrentWorkspaceId();
  const booking = await moc.venueBookings.approve(id, workspaceId);
  notifyEntityChanged("venue_booking", id);
  return booking;
}

export async function rejectVenueBooking(id: string): Promise<VenueBooking> {
  const workspaceId = await getCurrentWorkspaceId();
  const booking = await moc.venueBookings.reject(id, workspaceId);
  notifyEntityChanged("venue_booking", id);
  return booking;
}
