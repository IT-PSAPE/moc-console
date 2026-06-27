import { Input } from '@moc/ui/components/form/input'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import type { BookingFormData } from '@/types/booking'
import { isReturnBeforeCheckout } from '../hooks/use-booking-form'

type BookingDetailsProps = {
  data: BookingFormData
  onChange: (field: keyof BookingFormData, value: string) => void
}

export function BookingDetails({ data, onChange }: BookingDetailsProps) {
  const invalidRange = isReturnBeforeCheckout(data)

  function handleCheckedOutAtChange(value: string) {
    onChange('checkedOutAt', value)
  }

  function handleExpectedReturnAtChange(value: string) {
    onChange('expectedReturnAt', value)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Title" required />
        <Input placeholder="e.g. Sunday Service Setup" maxLength={120} value={data.title} onChange={(e) => onChange('title', e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" required />
        <Input placeholder="Who is booking this equipment?" value={data.bookedBy} onChange={(e) => onChange('bookedBy', e.target.value)} />
      </div>

      <DateTimeFields
        label="Checkout"
        required
        value={data.checkedOutAt}
        onChange={handleCheckedOutAtChange}
      />

      <DateTimeFields
        label="Expected return"
        required
        value={data.expectedReturnAt}
        onChange={handleExpectedReturnAtChange}
        errorText={invalidRange ? 'Expected return must be after checkout.' : undefined}
      />

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Notes" optional />
        <TextArea placeholder="Any notes about this booking..." value={data.notes} onChange={(e) => onChange('notes', e.target.value)} rows={3} />
      </div>
    </div>
  )
}
