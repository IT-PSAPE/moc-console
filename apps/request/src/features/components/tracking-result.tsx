import { Badge } from '@moc/ui/components/display/badge'
import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Divider } from '@moc/ui/components/display/divider'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { Hash, Package, User, CalendarDays, Flag, Tag, CalendarCheck, StickyNote, Building2 } from 'lucide-react'
import { venueBookingPhaseLabel, venueBookingPhaseColor } from '@moc/types/venues'
import type { VenueBookingPhase } from '@moc/types/venues'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { TrackingResult as TrackingResultType } from '@/types/booking'
import type { RequestPriority, RequestCategory } from '@/types/request'

const trackingTypeLabels: Record<TrackingResultType['type'], string> = {
  request: 'Request',
  booking: 'Booking',
  venue_booking: 'Venue Booking',
}

export function TrackingResult({ data }: { data: TrackingResultType }) {
  const isRequest = data.type === 'request'
  const isBooking = data.type === 'booking'
  const isVenueBooking = data.type === 'venue_booking'

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">{trackingTypeLabels[data.type]}</Label.xs>
        {data.title && <Title.h5>{data.title}</Title.h5>}
        <div className="flex flex-col gap-3">
          <MetaRow icon={<Hash />} label="Tracking code">
            <span className="font-mono">{data.trackingCode}</span>
          </MetaRow>

          {isRequest && (
            <>
              {data.status && (
                <MetaRow icon={<Flag />} label="Status">
                  <Badge label={STATUS_LABELS[data.status] ?? data.status} color={STATUS_COLORS[data.status] ?? 'gray'} />
                </MetaRow>
              )}
              <MetaRow icon={<User />} label="Requested by">{data.requestedBy}</MetaRow>
              {data.priority && (
                <MetaRow icon={<Flag />} label="Priority">
                  <Badge label={PRIORITY_LABELS[data.priority as RequestPriority] ?? data.priority} color={PRIORITY_COLORS[data.priority as RequestPriority] ?? 'gray'} />
                </MetaRow>
              )}
              {data.category && (
                <MetaRow icon={<Tag />} label="Category">
                  <Badge label={CATEGORY_LABELS[data.category as RequestCategory] ?? data.category} color="blue" variant="outline" />
                </MetaRow>
              )}
              {data.dueDate && (
                <MetaRow icon={<CalendarDays />} label="Due date">{formatDateTime(data.dueDate)}</MetaRow>
              )}
            </>
          )}

          {isBooking && (
            <>
              {data.status && (
                <MetaRow icon={<Flag />} label="Status">
                  <Badge label={STATUS_LABELS[data.status] ?? data.status} color={STATUS_COLORS[data.status] ?? 'gray'} />
                </MetaRow>
              )}
              <MetaRow icon={<User />} label="Booked by">{data.bookedBy}</MetaRow>
              {data.checkedOutAt && (
                <MetaRow icon={<CalendarDays />} label="Checkout">{formatDateTime(data.checkedOutAt)}</MetaRow>
              )}
              {data.expectedReturnAt && (
                <MetaRow icon={<CalendarCheck />} label="Expected return">{formatDateTime(data.expectedReturnAt)}</MetaRow>
              )}
              {data.returnedAt && (
                <MetaRow icon={<CalendarCheck />} label="Returned">{formatDateTime(data.returnedAt)}</MetaRow>
              )}
              {data.notes && (
                <MetaRow icon={<StickyNote />} label="Notes">{data.notes}</MetaRow>
              )}
            </>
          )}

          {isVenueBooking && (
            <>
              {data.status && (
                <MetaRow icon={<Flag />} label="Status">
                  <Badge label={venueBookingPhaseLabel[data.status as VenueBookingPhase] ?? data.status} color={venueBookingPhaseColor[data.status as VenueBookingPhase] ?? 'gray'} />
                </MetaRow>
              )}
              <MetaRow icon={<User />} label="Requested by">{data.requestedBy}</MetaRow>
              {data.venueName && (
                <MetaRow icon={<Building2 />} label="Venue">
                  {data.venueName}{data.venueLocation ? ` · ${data.venueLocation}` : ''}
                </MetaRow>
              )}
              {data.startsAt && (
                <MetaRow icon={<CalendarDays />} label="Starts">{formatDateTime(data.startsAt)}</MetaRow>
              )}
              {data.endsAt && (
                <MetaRow icon={<CalendarCheck />} label="Ends">{formatDateTime(data.endsAt)}</MetaRow>
              )}
              {data.notes && (
                <MetaRow icon={<StickyNote />} label="Notes">{data.notes}</MetaRow>
              )}
            </>
          )}

          <MetaRow icon={<CalendarDays />} label="Submitted">{formatDate(data.createdAt)}</MetaRow>
        </div>
      </section>

      {isBooking && data.items && data.items.length > 0 && (
        <>
          <Divider />
          <section className="flex flex-col gap-3">
            <Label.xs className="text-tertiary uppercase tracking-wider">Equipment ({data.items.length})</Label.xs>
            <div className="flex flex-col gap-0">
              {data.items.map((item, i) => (
                <div key={item.id}>
                  {i > 0 && <Divider className="my-3" />}
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-tertiary shrink-0" />
                    <Paragraph.sm>{item.equipmentName}</Paragraph.sm>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
