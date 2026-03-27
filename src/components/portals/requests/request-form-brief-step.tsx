import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/textarea'
import type { RequestFormState } from './request-form.types'

interface RequestFormBriefStepProps {
  form: RequestFormState
  onFieldChange: <K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) => void
}

export function RequestFormBriefStep({ form, onFieldChange }: RequestFormBriefStepProps) {
  function handleWhoChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFieldChange('who', event.target.value)
  }

  function handleWhatChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onFieldChange('what', event.target.value)
  }

  function handleWhenChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFieldChange('when', event.target.value)
  }

  function handleWhereChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFieldChange('where', event.target.value)
  }

  function handleWhyChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onFieldChange('why', event.target.value)
  }

  function handleHowChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onFieldChange('how', event.target.value)
  }

  function handleInfoChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onFieldChange('info', event.target.value)
  }

  return (
    <div className="space-y-4">
      <Input
        label="Who"
        id="req-who"
        placeholder="Name and department"
        value={form.who}
        onChange={handleWhoChange}
      />
      <TextArea
        label="What"
        id="req-what"
        rows={3}
        placeholder="Describe the resource, space, or support required"
        value={form.what}
        onChange={handleWhatChange}
      />
      <Input
        label="When"
        id="req-when"
        placeholder="e.g. 2026-05-15 or April 1–30"
        value={form.when}
        onChange={handleWhenChange}
      />
      <Input
        label="Where"
        id="req-where"
        placeholder="Building, hall, or address"
        value={form.where}
        onChange={handleWhereChange}
      />
      <TextArea
        label="Why"
        id="req-why"
        rows={3}
        placeholder="Why is this request needed?"
        value={form.why}
        onChange={handleWhyChange}
      />
      <TextArea
        label="How"
        id="req-how"
        rows={3}
        placeholder="How will this be delivered or executed?"
        value={form.how}
        onChange={handleHowChange}
      />
      <TextArea
        label="Additional Info"
        id="req-info"
        rows={3}
        placeholder="Anything else we should know?"
        value={form.info}
        onChange={handleInfoChange}
      />
    </div>
  )
}
