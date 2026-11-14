import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Label } from '@moc/ui/components/display/text'
import { User, Target as Archery, Building, Calendar, Repeat } from '@phosphor-icons/react'
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
          <MetaRow icon={<Building />} label="Venue">
            <Label.sm>{venueName}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Archery />} label="Event">
            <Label.sm>{eventLabel}</Label.sm>
          </MetaRow>
          {bookingWindow && (
            <>
              <MetaRow icon={<Calendar />} label="Starts">
                <Label.sm>{formatDateTime(bookingWindow.startsAt, timeZone ?? undefined)}</Label.sm>
              </MetaRow>
              <MetaRow icon={<Calendar />} label="Ends">
                <Label.sm>{formatDateTime(bookingWindow.endsAt, timeZone ?? undefined)}</Label.sm>
              </MetaRow>
            </>
          )}
          <MetaRow icon={<Repeat />} label="Repeats">
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
