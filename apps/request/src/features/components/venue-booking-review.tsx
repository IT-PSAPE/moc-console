import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Label } from '@moc/ui/components/display/text'
import { User, Target, Building2, CalendarClock, Repeat2 } from 'lucide-react'
import { formatVenueRecurrenceEndLabel, formatVenueRecurrenceLabel } from '@moc/types/venues'
import { formatDateTime } from '@/lib/utils'
import type { VenueBookingFormData } from '@/types/venue-booking'
import type { VenueBookingWindow } from '@/features/hooks/use-venue-booking-form'

type VenueBookingReviewProps = {
  data: VenueBookingFormData
  venueName: string
  eventLabel: string
  bookingWindow: VenueBookingWindow | null
  timeZone: string | null
}

export function VenueBookingReview({ data, venueName, eventLabel, bookingWindow, timeZone }: VenueBookingReviewProps) {
  const recurrenceEndLabel = formatVenueRecurrenceEndLabel(data.recurrence)

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Booking summary</Label.xs>
        <div className="flex flex-col gap-3">
          <MetaRow icon={<User />} label="Requested by">
            <Label.sm>{data.requestedBy}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Building2 />} label="Venue">
            <Label.sm>{venueName}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Target />} label="Event">
            <Label.sm>{eventLabel}</Label.sm>
          </MetaRow>
          {bookingWindow && (
            <>
              <MetaRow icon={<CalendarClock />} label="Starts">
                <Label.sm>{formatDateTime(bookingWindow.startsAt, timeZone ?? undefined)}</Label.sm>
              </MetaRow>
              <MetaRow icon={<CalendarClock />} label="Ends">
                <Label.sm>{formatDateTime(bookingWindow.endsAt, timeZone ?? undefined)}</Label.sm>
              </MetaRow>
            </>
          )}
          <MetaRow icon={<Repeat2 />} label="Repeats">
            <div className="flex flex-col">
              <Label.sm>{formatVenueRecurrenceLabel(data.recurrence)}</Label.sm>
              {recurrenceEndLabel && <Label.xs className="text-tertiary">{recurrenceEndLabel}</Label.xs>}
            </div>
          </MetaRow>
        </div>
      </section>
    </div>
  )
}
