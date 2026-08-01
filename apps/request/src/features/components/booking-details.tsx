import { Input } from '@moc/ui/components/form/input'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import type { BookingFormData } from '@/types/booking'
import { isReturnBeforeCheckout } from '../hooks/use-booking-form'
import type { ChangeEvent } from 'react'

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

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange('title', event.target.value)
  }

  function handleBookedByChange(event: ChangeEvent<HTMLInputElement>) {
    onChange('bookedBy', event.target.value)
  }

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange('notes', event.target.value)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Title" required />
        <Input aria-label="Title" name="title" autoComplete="off" placeholder="e.g. Sunday service setup" maxLength={120} value={data.title} onChange={handleTitleChange} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" required />
        <Input aria-label="Requested by" name="booked-by" autoComplete="name" placeholder="Who is booking this equipment?" value={data.bookedBy} onChange={handleBookedByChange} />
      </div>

      <DateTimeFields
        label="Checkout"
        name="checkout"
        required
        value={data.checkedOutAt}
        onChange={handleCheckedOutAtChange}
      />

      <DateTimeFields
        label="Expected return"
        name="expected-return"
        required
        value={data.expectedReturnAt}
        onChange={handleExpectedReturnAtChange}
        errorText={invalidRange ? 'Expected return must be after checkout.' : undefined}
      />

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Notes" optional />
        <TextArea aria-label="Notes" name="notes" placeholder="Any notes about this booking…" value={data.notes} onChange={handleNotesChange} rows={3} />
      </div>
    </div>
  )
}
