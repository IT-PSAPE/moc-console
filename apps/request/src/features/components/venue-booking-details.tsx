import { Input } from '@moc/ui/components/form/input'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormField } from '@moc/ui/components/form/form-label'
import { FieldError } from '@/features/components/field-error'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import type { VenueBookingFormData, VenueBookingTextField } from '@/types/venue-booking'
import type { ChangeEvent } from 'react'

type VenueBookingDetailsProps = {
  data: VenueBookingFormData
  onChange: (field: VenueBookingTextField, value: string) => void
  errors: StepValidationErrors
}

export function VenueBookingDetails({ data, onChange, errors }: VenueBookingDetailsProps) {
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.name as VenueBookingTextField, event.target.value)
  }

  function handleTextAreaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.name as VenueBookingTextField, event.target.value)
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField label="Title" htmlFor="title" required>
        <Input id="title" aria-label="Title" aria-invalid={Boolean(errors.title) || undefined} aria-describedby={errors.title ? 'title-error' : undefined} name="title" autoComplete="off" placeholder="e.g. Sunday service" maxLength={120} value={data.title} onChange={handleInputChange} required />
        <FieldError id="title-error" message={errors.title} />
      </FormField>

      <FormField label="Requested by" htmlFor="requested-by" required>
        <Input id="requested-by" aria-label="Requested by" aria-invalid={Boolean(errors['requested-by']) || undefined} aria-describedby={errors['requested-by'] ? 'requested-by-error' : undefined} name="requestedBy" autoComplete="name" placeholder="Who is booking this venue?" value={data.requestedBy} onChange={handleInputChange} required />
        <FieldError id="requested-by-error" message={errors['requested-by']} />
      </FormField>

      <FormField label="Who" htmlFor="who" required>
        <TextArea id="who" aria-label="Who" aria-invalid={Boolean(errors.who) || undefined} aria-describedby={errors.who ? 'who-error' : undefined} name="who" placeholder="Who is involved or responsible?" value={data.who} onChange={handleTextAreaChange} rows={2} required />
        <FieldError id="who-error" message={errors.who} />
      </FormField>

      <FormField label="What" htmlFor="what" required>
        <TextArea id="what" aria-label="What" aria-invalid={Boolean(errors.what) || undefined} aria-describedby={errors.what ? 'what-error' : undefined} name="what" placeholder="What needs to happen at this venue?" value={data.what} onChange={handleTextAreaChange} rows={2} required />
        <FieldError id="what-error" message={errors.what} />
      </FormField>

      <FormField label="When" htmlFor="when-text" required>
        <TextArea id="when-text" aria-label="When" aria-invalid={Boolean(errors['when-text']) || undefined} aria-describedby={errors['when-text'] ? 'when-text-error' : undefined} name="whenText" placeholder="When does this need to happen?" value={data.whenText} onChange={handleTextAreaChange} rows={2} required />
        <FieldError id="when-text-error" message={errors['when-text']} />
      </FormField>

      <FormField label="Where" htmlFor="where-text" required>
        <TextArea id="where-text" aria-label="Where" aria-invalid={Boolean(errors['where-text']) || undefined} aria-describedby={errors['where-text'] ? 'where-text-error' : undefined} name="whereText" placeholder="Where within the venue will this take place?" value={data.whereText} onChange={handleTextAreaChange} rows={2} required />
        <FieldError id="where-text-error" message={errors['where-text']} />
      </FormField>

      <FormField label="Why" htmlFor="why" required>
        <TextArea id="why" aria-label="Why" aria-invalid={Boolean(errors.why) || undefined} aria-describedby={errors.why ? 'why-error' : undefined} name="why" placeholder="Why is this needed?" value={data.why} onChange={handleTextAreaChange} rows={2} required />
        <FieldError id="why-error" message={errors.why} />
      </FormField>

      <FormField label="How" htmlFor="how" required>
        <TextArea id="how" aria-label="How" aria-invalid={Boolean(errors.how) || undefined} aria-describedby={errors.how ? 'how-error' : undefined} name="how" placeholder="How should this be executed?" value={data.how} onChange={handleTextAreaChange} rows={2} required />
        <FieldError id="how-error" message={errors.how} />
      </FormField>

      <FormField label="Notes" optional>
        <TextArea aria-label="Notes" name="notes" placeholder="Any additional notes or context…" value={data.notes} onChange={handleTextAreaChange} rows={3} />
      </FormField>
    </div>
  )
}
