import { Input } from '@/components/form/input'
import { Textarea } from '@/components/form/textarea'
import { FormLabel } from '@/components/form/form-label'
import { Paragraph } from '@/components/display/text'
import type { BookingFormData } from '@/types/booking'
import { isReturnBeforeCheckout } from '../hooks/use-booking-form'

type BookingDetailsProps = {
  data: BookingFormData
  onChange: (field: keyof BookingFormData, value: string) => void
}

export function BookingDetails({ data, onChange }: BookingDetailsProps) {
  const invalidRange = isReturnBeforeCheckout(data)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" required />
        <Input placeholder="Who is booking this equipment?" value={data.bookedBy} onChange={(e) => onChange('bookedBy', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <FormLabel label="Checkout date" required />
          <Input type="datetime-local" value={data.checkedOutAt} onChange={(e) => onChange('checkedOutAt', e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <FormLabel label="Expected return" required />
          <Input type="datetime-local" value={data.expectedReturnAt} onChange={(e) => onChange('expectedReturnAt', e.target.value)} />
          {invalidRange && (
            <Paragraph.xs className="text-error">Expected return must be after checkout.</Paragraph.xs>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Notes" optional />
        <Textarea placeholder="Any notes about this booking..." value={data.notes} onChange={(e) => onChange('notes', e.target.value)} rows={3} />
      </div>
    </div>
  )
}
