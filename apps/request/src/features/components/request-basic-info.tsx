import { Input } from '@moc/ui/components/form/input'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { cn } from '@moc/utils/cn'
import { ChevronDown } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS, CATEGORIES, CATEGORY_LABELS } from '../constants'
import type { RequestFormData } from '@/types/request'

type RequestBasicInfoProps = {
  data: RequestFormData
  onChange: (field: keyof RequestFormData, value: string) => void
}

export function RequestBasicInfo({ data, onChange }: RequestBasicInfoProps) {
  function handleTitleChange(value: string) {
    onChange('title', value)
  }

  function handleRequestedByChange(value: string) {
    onChange('requestedBy', value)
  }

  function handlePriorityChange(value: string) {
    onChange('priority', value)
  }

  function handleCategoryChange(value: string) {
    onChange('category', value)
  }

  function handleDueDateChange(value: string) {
    onChange('dueDate', value)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Title" required />
        <Input placeholder="e.g. Easter service recap video" value={data.title} onChange={(e) => handleTitleChange(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" required />
        <Input placeholder="e.g. Lead Pastor" value={data.requestedBy} onChange={(e) => handleRequestedByChange(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 w-full">
          <FormLabel label="Priority" required />
          <SelectField
            value={data.priority}
            options={PRIORITIES}
            labels={PRIORITY_LABELS}
            onSelect={handlePriorityChange}
          />
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <FormLabel label="Category" required />
          <SelectField
            value={data.category}
            options={CATEGORIES}
            labels={CATEGORY_LABELS}
            onSelect={handleCategoryChange}
          />
        </div>
      </div>

      <DateTimeFields
        label="Due date"
        required
        value={data.dueDate}
        onChange={handleDueDateChange}
      />
    </div>
  )
}

function SelectField<T extends string>({ value, options, labels, onSelect }: { value: T; options: T[]; labels: Record<T, string>; onSelect: (value: T) => void }) {
  return (
    <Dropdown>
      <Dropdown.Trigger className='w-full'>
        <div className={cn(
          'h-10 flex w-full items-center justify-between gap-2',
          'rounded-lg border border-secondary bg-primary px-3 py-2',
          'cursor-pointer hover:border-brand transition-colors'
        )}>
          <Paragraph.sm>{labels[value]}</Paragraph.sm>
          <ChevronDown className="size-4 text-tertiary" />
        </div>
      </Dropdown.Trigger>
      <Dropdown.Panel>
        {options.map((option) => (
          <Dropdown.Item key={option} onSelect={() => onSelect(option)}>
            <Label.sm className={cn(option === value && 'text-brand')}>{labels[option]}</Label.sm>
          </Dropdown.Item>
        ))}
      </Dropdown.Panel>
    </Dropdown>
  )
}
