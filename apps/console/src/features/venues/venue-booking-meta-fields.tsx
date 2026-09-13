import { Building2, CalendarClock, CircleDot, Clock, History, MapPin, Target, Ticket, User } from "lucide-react";
import { Badge } from "@moc/ui/components/display/badge";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Paragraph } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { deriveVenueBookingPhase, isOtherVenueBookingEvent, venueBookingEventLabel, venueBookingPhaseColor, venueBookingPhaseLabel } from "@moc/types/venues";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

export function VenueBookingMetaFields({ booking, at }: { booking: VenueBooking; at: Date }) {
  const phase = deriveVenueBookingPhase(booking.status, booking.startsAt, booking.endsAt, at);

  return (
    <div className="space-y-3">
      <MetaRow icon={<CircleDot />} label="Status"><Badge label={venueBookingPhaseLabel[phase]} color={venueBookingPhaseColor[phase]} /></MetaRow>
      <MetaRow icon={<Building2 />} label="Venue"><Paragraph.sm>{booking.venueName}</Paragraph.sm></MetaRow>
      {booking.venueLocation && <MetaRow icon={<MapPin />} label="Location"><Paragraph.sm>{booking.venueLocation}</Paragraph.sm></MetaRow>}
      <MetaRow icon={<Target />} label="Event">
        <div className="flex min-w-0 items-center gap-2">
          <Paragraph.sm>{venueBookingEventLabel(booking)}</Paragraph.sm>
          {/* The submitter described this one themselves rather than picking
              from the workspace list, which is worth knowing at a glance. */}
          {isOtherVenueBookingEvent(booking) && <Badge label="Other" color="gray" variant="outline" />}
        </div>
      </MetaRow>
      <MetaRow icon={<CalendarClock />} label="Booked for">
        <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(booking.startsAt)} – {formatUtcIsoInBrowserTimeZone(booking.endsAt, { hour: "2-digit", minute: "2-digit" })}</Paragraph.sm>
      </MetaRow>
      <MetaRow icon={<Ticket />} label="Tracking code"><Paragraph.sm>{booking.trackingCode}</Paragraph.sm></MetaRow>
      <MetaRow icon={<User />} label="Requested by"><Paragraph.sm>{booking.requestedBy}</Paragraph.sm></MetaRow>
      <MetaRow icon={<Clock />} label="Created"><Paragraph.sm>{formatUtcIsoInBrowserTimeZone(booking.createdAt)}</Paragraph.sm></MetaRow>
      <MetaRow icon={<History />} label="Last updated"><Paragraph.sm>{formatUtcIsoInBrowserTimeZone(booking.updatedAt)}</Paragraph.sm></MetaRow>
    </div>
  );
}
