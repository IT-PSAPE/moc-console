import { Textarea } from '@moc/ui/components/form/textarea'
import { FormLabel } from '@moc/ui/components/form/form-label'
import type { RequestFormData } from '@/types/request'

type RequestFlowProps = {
  data: RequestFormData
  onChange: (field: keyof RequestFormData, value: string) => void
}

export function RequestFlow({ data, onChange }: RequestFlowProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Flow" optional />
        <Textarea placeholder="Describe the sequence or flow of events..." value={data.flow} onChange={(e) => onChange('flow', e.target.value)} rows={6} />
      </div>
    </div>
  )
}
