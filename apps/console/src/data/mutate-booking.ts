import type { Booking, BookingStatus } from "@moc/types/equipment/booking";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";
import { notifyEntityChanged } from "./notify-event";

// The API deliberately preserves the requester's title when staff update the
// booking lifecycle and notes.
export async function updateBooking(booking: Booking): Promise<Booking> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.bookings.update(booking, workspaceId);
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.bookings.updateStatus(id, status, workspaceId);
  notifyEntityChanged("booking", id);
}

export async function deleteBooking(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.bookings.delete(id, workspaceId);
}
