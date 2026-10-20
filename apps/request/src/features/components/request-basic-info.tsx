import { Input } from '@moc/ui/components/form/input'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { FieldError } from '@/features/components/field-error'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import { SelectField } from '@moc/ui/components/form/select-field'
import type { RequestFormData } from '@/types/request'
import type { RequestCategoryOption } from '@/types/tracking'
import type { ChangeEvent } from 'react'

type RequestBasicInfoProps = {
  data: RequestFormData
  categories: RequestCategoryOption[]
  categoryUnavailable: boolean
  categoryPlaceholder: string
  onChange: (field: keyof RequestFormData, value: string) => void
  errors: StepValidationErrors
}

export function RequestBasicInfo({ data, categories, categoryUnavailable, categoryPlaceholder, onChange, errors }: RequestBasicInfoProps) {
  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange('title', event.target.value)
  }

  function handleRequestedByChange(event: ChangeEvent<HTMLInputElement>) {
    onChange('requestedBy', event.target.value)
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
        <FormLabel label="Title" htmlFor="title" required />
        <Input id="title" aria-label="Title" aria-invalid={Boolean(errors.title) || undefined} aria-describedby={errors.title ? 'title-error' : undefined} name="title" autoComplete="off" placeholder="e.g. Easter service recap video" value={data.title} onChange={handleTitleChange} required />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Requested by" htmlFor="requested-by" required />
        <Input id="requested-by" aria-label="Requested by" aria-invalid={Boolean(errors['requested-by']) || undefined} aria-describedby={errors['requested-by'] ? 'requested-by-error' : undefined} name="requested-by" autoComplete="name" placeholder="e.g. Lead pastor" value={data.requestedBy} onChange={handleRequestedByChange} required />
        <FieldError id="requested-by-error" message={errors['requested-by']} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FormLabel label="Category" required />
        <SelectField
          label="Category"
          name="category"
          value={data.category}
          items={categories}
          disabled={categoryUnavailable}
          placeholder={categoryPlaceholder}
          onValueChange={handleCategoryChange}
        />
        <FieldError id="category-error" message={errors.category} />
      </div>

      <DateTimeFields
        label="Due date"
        name="due-date"
        required
        value={data.dueDate}
        onChange={handleDueDateChange}
        errorText={errors['due-date-date']}
      />
    </div>
  )
}
