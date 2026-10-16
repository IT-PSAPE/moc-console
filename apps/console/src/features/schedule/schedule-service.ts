import type { Booking } from "@moc/types/equipment/booking";
import type { Request } from "@moc/types/requests";
import type { VenueBooking } from "@moc/types/venues";
import { fetchBookings } from "@/data/fetch-equipment";
import { fetchRequests } from "@/data/fetch-requests";
import { fetchVenueBookings } from "@/data/fetch-venue-bookings";

export type ScheduleData = {
  bookings: Booking[];
  requests: Request[];
  venueBookings: VenueBooking[];
};

export async function fetchScheduleData(workspaceId: string): Promise<ScheduleData> {
  const [bookings, requests, venueBookings] = await Promise.all([
    fetchBookings(workspaceId),
    fetchRequests(workspaceId),
    fetchVenueBookings(workspaceId),
  ]);

  return { bookings, requests, venueBookings };
}
