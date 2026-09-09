import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import type { RequestFormData } from '@/types/request'
import type { ChangeEvent } from 'react'

type RequestFlowProps = {
  data: RequestFormData
  onChange: (field: keyof RequestFormData, value: string) => void
}

export function RequestFlow({ data, onChange }: RequestFlowProps) {
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange('flow', event.target.value)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Flow" optional />
        <TextArea aria-label="Flow" name="flow" placeholder="Describe the sequence or flow of events…" value={data.flow} onChange={handleChange} rows={6} />
      </div>
    </div>
  )
}
