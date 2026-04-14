import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Dropdown } from '@/components/overlays/dropdown'
import { Label } from '@/components/display/text'
import { cn } from '@/utils/cn'
import { ChevronDown } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS, CATEGORIES, CATEGORY_LABELS } from '../constants'
import type { RequestFormData } from '@/types/request'

type RequestBasicInfoProps = {
  data: RequestFormData
  onChange: (field: keyof RequestFormData, value: string) => void
}

export function RequestBasicInfo({ data, onChange }: RequestBasicInfoProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Title" required />
        <Input placeholder="e.g. Easter service recap video" value={data.title} onChange={(e) => onChange('title', e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" required />
        <Input placeholder="e.g. Lead Pastor" value={data.requestedBy} onChange={(e) => onChange('requestedBy', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <FormLabel label="Priority" required />
          <SelectField
            value={data.priority}
            options={PRIORITIES}
            labels={PRIORITY_LABELS}
            onSelect={(value) => onChange('priority', value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FormLabel label="Category" required />
          <SelectField
            value={data.category}
            options={CATEGORIES}
            labels={CATEGORY_LABELS}
            onSelect={(value) => onChange('category', value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Due date" required />
        <Input type="date" value={data.dueDate} onChange={(e) => onChange('dueDate', e.target.value)} />
      </div>
    </div>
  )
}

function SelectField<T extends string>({ value, options, labels, onSelect }: { value: T; options: T[]; labels: Record<T, string>; onSelect: (value: T) => void }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger>
        <div className={cn(
          'flex w-full items-center justify-between gap-2',
          'rounded-lg border border-secondary bg-primary px-3 py-2',
          'cursor-pointer hover:border-brand transition-colors'
        )}>
          <Label.sm>{labels[value]}</Label.sm>
          <ChevronDown className="size-4 text-tertiary" />
        </div>
      </Dropdown.Trigger>
      <Dropdown.Panel className="w-(--radix-dropdown-trigger-width)">
        {options.map((option) => (
          <Dropdown.Item key={option} onSelect={() => onSelect(option)}>
            <Label.xs className={cn(option === value && 'text-brand')}>{labels[option]}</Label.xs>
          </Dropdown.Item>
        ))}
      </Dropdown.Panel>
    </Dropdown.Root>
  )
}
