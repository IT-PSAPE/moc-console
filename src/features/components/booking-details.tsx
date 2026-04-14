import { Input } from '@/components/form/input'
import { Textarea } from '@/components/form/textarea'
import { FormLabel } from '@/components/form/form-label'
import type { BookingFormData } from '@/types/booking'

type BookingDetailsProps = {
  data: BookingFormData
  onChange: (field: keyof BookingFormData, value: string) => void
}

export function BookingDetails({ data, onChange }: BookingDetailsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Your name" required />
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
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Notes" optional />
        <Textarea placeholder="Any notes about this booking..." value={data.notes} onChange={(e) => onChange('notes', e.target.value)} rows={3} />
      </div>
    </div>
  )
}
