import { Card } from '@/components/display/card'
import { Badge } from '@/components/display/badge'
import { MetaRow } from '@/components/display/meta-row'
import { Label } from '@/components/display/text'
import { Package, User, CalendarDays, CalendarCheck, StickyNote } from 'lucide-react'
import type { BookingFormData } from '@/types/booking'
import type { PublicEquipmentItem } from '@/types/equipment'

type BookingReviewProps = {
  data: BookingFormData
  selectedEquipment: PublicEquipmentItem[]
}

export function BookingReview({ data, selectedEquipment }: BookingReviewProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Label.sm>Booking Summary</Label.sm>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3 p-3">
        <MetaRow icon={<Package />} label="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {selectedEquipment.map((item) => (
              <Badge key={item.id} label={item.name} color="blue" variant="outline" />
            ))}
          </div>
        </MetaRow>
        <MetaRow icon={<User />} label="Booked by">
          {data.bookedBy}
        </MetaRow>
        <MetaRow icon={<CalendarDays />} label="Checkout">
          {formatDateTime(data.checkedOutAt)}
        </MetaRow>
        <MetaRow icon={<CalendarCheck />} label="Expected return">
          {formatDateTime(data.expectedReturnAt)}
        </MetaRow>
        {data.notes && (
          <MetaRow icon={<StickyNote />} label="Notes">
            {data.notes}
          </MetaRow>
        )}
      </Card.Content>
    </Card.Root>
  )
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
