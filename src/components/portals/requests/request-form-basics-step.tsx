import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { REQUEST_PRIORITY_OPTIONS, REQUEST_TYPE_OPTIONS } from './request-constants'
import type { RequestFormState } from './request-form.types'

interface RequestFormBasicsStepProps {
  form: RequestFormState
  noticeAlert: string | null
  onFieldChange: <K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) => void
}

export function RequestFormBasicsStep({ form, noticeAlert, onFieldChange }: RequestFormBasicsStepProps) {
  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFieldChange('title', event.target.value)
  }

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFieldChange('requester_email', event.target.value)
  }

  function handleTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    onFieldChange('type', event.target.value as RequestFormState['type'])
  }

  function handlePriorityChange(event: React.ChangeEvent<HTMLSelectElement>) {
    onFieldChange('priority', event.target.value as RequestFormState['priority'])
  }

  function handleDueDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFieldChange('due_date', event.target.value)
  }

  return (
    <div className="space-y-4">
      <Input
        label="Request Title"
        id="req-title"
        placeholder="Brief descriptive title"
        value={form.title}
        onChange={handleTitleChange}
      />
      <Input
        label="Requester Email"
        id="req-email"
        type="email"
        placeholder="requester@culture.gov"
        value={form.requester_email}
        onChange={handleEmailChange}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="req-type" label="Type" value={form.type} onChange={handleTypeChange}>
          {REQUEST_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select id="req-priority" label="Priority" value={form.priority} onChange={handlePriorityChange}>
          {REQUEST_PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Due Date"
        id="req-due"
        type="date"
        value={form.due_date}
        onChange={handleDueDateChange}
      />
      {noticeAlert && (
        <div className="rounded-xl border border-utility-warning-200 bg-utility-warning-50 px-4 py-3 text-sm text-utility-warning-700">
          {noticeAlert}
        </div>
      )}
    </div>
  )
}
