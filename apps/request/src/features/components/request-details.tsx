import { TextArea } from '@moc/ui/components/form/text-area'
import { FormField } from '@moc/ui/components/form/form-label'
import type { RequestFormData } from '@/types/request'
import type { ChangeEvent } from 'react'

type RequestDetailsProps = {
  data: RequestFormData
  onChange: (field: keyof RequestFormData, value: string) => void
}

export function RequestDetails({ data, onChange }: RequestDetailsProps) {
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.name as keyof RequestFormData, event.target.value)
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField label="Who" required>
        <TextArea aria-label="Who" name="who" placeholder="Who is involved or responsible?" value={data.who} onChange={handleChange} rows={2} />
      </FormField>

      <FormField label="What" required>
        <TextArea aria-label="What" name="what" placeholder="What needs to be done?" value={data.what} onChange={handleChange} rows={2} />
      </FormField>

      <FormField label="When" required>
        <TextArea aria-label="When" name="whenText" placeholder="When does this need to happen?" value={data.whenText} onChange={handleChange} rows={2} />
      </FormField>

      <FormField label="Where" required>
        <TextArea aria-label="Where" name="whereText" placeholder="Where will this take place?" value={data.whereText} onChange={handleChange} rows={2} />
      </FormField>

      <FormField label="Why" required>
        <TextArea aria-label="Why" name="why" placeholder="Why is this needed?" value={data.why} onChange={handleChange} rows={2} />
      </FormField>

      <FormField label="How" required>
        <TextArea aria-label="How" name="how" placeholder="How should this be executed?" value={data.how} onChange={handleChange} rows={2} />
      </FormField>

      <FormField label="Notes" optional>
        <TextArea aria-label="Notes" name="notes" placeholder="Any additional notes or context…" value={data.notes} onChange={handleChange} rows={3} />
      </FormField>
    </div>
  )
}
