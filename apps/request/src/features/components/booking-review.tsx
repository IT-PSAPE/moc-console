import { Badge } from '@moc/ui/components/display/badge'
import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Label } from '@moc/ui/components/display/text'
import { Package, User, CalendarDays, CalendarCheck, StickyNote, FileText, Plus } from 'lucide-react'
import type { BookingFormData } from '@/types/booking'
import { formatDateTime } from '@/lib/utils'

type BookingReviewProps = {
  data: BookingFormData
}

export function BookingReview({ data }: BookingReviewProps) {
  // TODO(equipment-inventory): STOPGAP — review reflects the hardcoded
  // selection (requestedEquipment + otherEquipment) rather than fetched
  // equipment. Restore the fetched-item summary when inventory is back.
  const other = data.otherEquipment.trim()

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Booking Summary</Label.xs>
        <div className="flex flex-col gap-3">
          <MetaRow icon={<FileText />} label="Title">
            <Label.sm>{data.title}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Package />} label="Equipment">
            <div className="flex flex-wrap gap-1.5">
              {data.requestedEquipment.map((label) => (
                <Badge key={label} label={label} color="blue" variant="outline" />
              ))}
              {other && <Badge label="Other" color="gray" variant="outline" />}
            </div>
          </MetaRow>
          {other && (
            <MetaRow icon={<Plus />} label="Other">
              <Label.sm>{other}</Label.sm>
            </MetaRow>
          )}
          <MetaRow icon={<User />} label="Booked by">
            <Label.sm>{data.bookedBy}</Label.sm>
          </MetaRow>
          <MetaRow icon={<CalendarDays />} label="Checkout">
            <Label.sm>{formatDateTime(data.checkedOutAt)}</Label.sm>
          </MetaRow>
          <MetaRow icon={<CalendarCheck />} label="Expected return">
            <Label.sm>{formatDateTime(data.expectedReturnAt)}</Label.sm>
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
