import { Input } from '@moc/ui/components/form/input'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { FieldError } from '@/features/components/field-error'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import type { BookingFormData } from '@/types/booking'
import { isReturnBeforeCheckout } from '@/features/public-flow-validation'
import type { ChangeEvent } from 'react'

type BookingDetailsProps = {
  data: BookingFormData
  onChange: (field: keyof BookingFormData, value: string) => void
  errors: StepValidationErrors
}

export function BookingDetails({ data, onChange, errors }: BookingDetailsProps) {
  const invalidRange = isReturnBeforeCheckout(data)
  const expectedReturnError = errors['expected-return-date'] ?? (invalidRange ? 'Expected return must be after checkout.' : undefined)

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
        <FormLabel label="Title" htmlFor="title" required />
        <Input id="title" aria-label="Title" aria-invalid={Boolean(errors.title) || undefined} aria-describedby={errors.title ? 'title-error' : undefined} name="title" autoComplete="off" placeholder="e.g. Sunday service setup" maxLength={120} value={data.title} onChange={handleTitleChange} required />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" htmlFor="booked-by" required />
        <Input id="booked-by" aria-label="Requested by" aria-invalid={Boolean(errors['booked-by']) || undefined} aria-describedby={errors['booked-by'] ? 'booked-by-error' : undefined} name="booked-by" autoComplete="name" placeholder="Who is booking this equipment?" value={data.bookedBy} onChange={handleBookedByChange} required />
        <FieldError id="booked-by-error" message={errors['booked-by']} />
      </div>

      <DateTimeFields
        label="Checkout"
        name="checkout"
        required
        value={data.checkedOutAt}
        onChange={handleCheckedOutAtChange}
        errorText={errors['checkout-date']}
      />

      <DateTimeFields
        label="Expected return"
        name="expected-return"
        required
        value={data.expectedReturnAt}
        onChange={handleExpectedReturnAtChange}
        errorText={expectedReturnError}
      />

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Notes" optional />
        <TextArea aria-label="Notes" name="notes" placeholder="Any notes about this booking…" value={data.notes} onChange={handleNotesChange} rows={3} />
      </div>
    </div>
  )
}
