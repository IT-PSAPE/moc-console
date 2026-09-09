import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Divider } from '@moc/ui/components/display/divider'
import { Label } from '@moc/ui/components/display/text'
import { User, FileText, Users, MapPin, Clock, Target, Lightbulb, Wrench, StickyNote, Building2, CalendarClock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { VenueBookingFormData } from '@/types/venue-booking'
import type { VenueBookingWindow } from '@/features/hooks/use-venue-booking-form'

type VenueBookingReviewProps = {
  data: VenueBookingFormData
  venueName: string
  bookingWindow: VenueBookingWindow | null
  timeZone: string | null
}

export function VenueBookingReview({ data, venueName, bookingWindow, timeZone }: VenueBookingReviewProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Booking summary</Label.xs>
        <div className="flex flex-col gap-3">
          <MetaRow icon={<FileText />} label="Title">
            <Label.sm>{data.title}</Label.sm>
          </MetaRow>
          <MetaRow icon={<User />} label="Requested by">
            <Label.sm>{data.requestedBy}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Building2 />} label="Venue">
            <Label.sm>{venueName}</Label.sm>
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
        </div>
      </section>

      <Divider />

      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Details</Label.xs>
        <div className="flex flex-col gap-3 whitespace-pre-wrap">
          <MetaRow icon={<Users />} label="Who">
            <Label.sm>{data.who}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Target />} label="What">
            <Label.sm>{data.what}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Clock />} label="When">
            <Label.sm>{data.whenText}</Label.sm>
          </MetaRow>
          <MetaRow icon={<MapPin />} label="Where">
            <Label.sm>{data.whereText}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Lightbulb />} label="Why">
            <Label.sm>{data.why}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Wrench />} label="How">
            <Label.sm>{data.how}</Label.sm>
          </MetaRow>
          {data.notes && (
            <MetaRow icon={<StickyNote />} label="Notes">
              <Label.sm>{data.notes}</Label.sm>
            </MetaRow>
          )}
        </div>
      </section>
    </div>
  )
}
