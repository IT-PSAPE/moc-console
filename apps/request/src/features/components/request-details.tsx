import { Textarea } from '@moc/ui/components/form/textarea'
import { FormField } from '@moc/ui/components/form/form-label'
import type { RequestFormData } from '@/types/request'

type RequestDetailsProps = {
  data: RequestFormData
  onChange: (field: keyof RequestFormData, value: string) => void
}

export function RequestDetails({ data, onChange }: RequestDetailsProps) {
  return (
    <div className="flex flex-col gap-5">
      <FormField label="Who" required info >
        <Textarea placeholder="Who is involved or responsible?" value={data.who} onChange={(e) => onChange('who', e.target.value)} rows={2} />
      </FormField>

      <FormField label="What" required info >
        <Textarea placeholder="What needs to be done?" value={data.what} onChange={(e) => onChange('what', e.target.value)} rows={2} />
      </FormField>

      <FormField label="When" required info >
        <Textarea placeholder="When does this need to happen?" value={data.whenText} onChange={(e) => onChange('whenText', e.target.value)} rows={2} />
      </FormField>

      <FormField label="Where" required info >
        <Textarea placeholder="Where will this take place?" value={data.whereText} onChange={(e) => onChange('whereText', e.target.value)} rows={2} />
      </FormField>

      <FormField label="Why" required info >
        <Textarea placeholder="Why is this needed?" value={data.why} onChange={(e) => onChange('why', e.target.value)} rows={2} />
      </FormField>

      <FormField label="How" required info >
        <Textarea placeholder="How should this be executed?" value={data.how} onChange={(e) => onChange('how', e.target.value)} rows={2} />
      </FormField>

      <FormField label="Notes" required info >
        <Textarea placeholder="Any additional notes or context..." value={data.notes} onChange={(e) => onChange('notes', e.target.value)} rows={3} />
      </FormField>
    </div>
  )
}


