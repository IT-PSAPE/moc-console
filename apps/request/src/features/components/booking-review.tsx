import { Badge } from '@/components/display/badge'
import { MetaRow } from '@/components/display/meta-row'
import { Label } from '@/components/display/text'
import { Package, User, CalendarDays, CalendarCheck, StickyNote } from 'lucide-react'
import type { BookingFormData } from '@/types/booking'
import type { PublicEquipmentItem } from '@/types/equipment'
import { formatDateTime } from '@/lib/utils'

type BookingReviewProps = {
  data: BookingFormData
  selectedEquipment: PublicEquipmentItem[]
}

export function BookingReview({ data, selectedEquipment }: BookingReviewProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Booking Summary</Label.xs>
        <div className="flex flex-col gap-3">
          <MetaRow icon={<Package />} label="Equipment">
            <div className="flex flex-wrap gap-1.5">
              {selectedEquipment.map((item) => (
                <Badge key={item.id} label={item.name} color="blue" variant="outline" />
              ))}
            </div>
          </MetaRow>
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
