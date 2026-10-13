import type { Booking } from "@moc/types/equipment/booking";
import type { Checklist } from "@moc/types/checklists";
import type { Request } from "@moc/types/requests";
import type { Stream } from "@moc/types/streams/stream";
import type { ZoomMeeting } from "@moc/types/streams/zoom";
import type { VenueBooking } from "@moc/types/venues";
import { fetchBookings } from "@/data/fetch-equipment";
import { fetchChecklists } from "@/data/fetch-checklists";
import { fetchRequests } from "@/data/fetch-requests";
import { fetchStreams } from "@/data/fetch-streams";
import { fetchZoomMeetings } from "@/data/fetch-zoom";
import { fetchVenueBookings } from "@/data/fetch-venue-bookings";
import { fetchScheduledMessages } from "@/features/scheduled-messages/services/scheduled-message-service";
import type { ScheduledOccurrence } from "@moc/notifications";

export type ScheduleData = {
  bookings: Booking[];
  checklists: Checklist[];
  requests: Request[];
  streams: Stream[];
  meetings: ZoomMeeting[];
  venueBookings: VenueBooking[];
  messages: ScheduledOccurrence[];
};

export async function fetchScheduleData(workspaceId: string, includeMessages: boolean): Promise<ScheduleData> {
  const [bookings, checklists, requests, streams, meetings, venueBookings, messages] = await Promise.all([
    fetchBookings(workspaceId),
    fetchChecklists(workspaceId),
    fetchRequests(workspaceId),
    fetchStreams(workspaceId),
    fetchZoomMeetings(workspaceId),
    fetchVenueBookings(workspaceId),
    includeMessages ? fetchScheduledMessages(workspaceId).then(snapshot => snapshot.occurrences) : Promise.resolve([]),
  ]);

  return { bookings, checklists, requests, streams, meetings, venueBookings, messages };
}
