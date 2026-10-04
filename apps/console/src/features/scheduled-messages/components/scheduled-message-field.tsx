import type { ChangeEvent } from 'react'
import type { ScheduledFieldDefinition } from '@moc/notifications'
import { FormField } from '@moc/ui/components/form/form-field'
import { Input } from '@moc/ui/components/form/input'
import { TextArea } from '@moc/ui/components/form/text-area'

type ScheduledMessageFieldProps = { field: ScheduledFieldDefinition; value: string; labelPrefix: string; disabled?: boolean; onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }

export function ScheduledMessageField({ field, value, labelPrefix, disabled, onChange }: ScheduledMessageFieldProps) {
    return <FormField label={field.label} optional={field.inputType === 'date'}>
        {field.key === 'instructions'
            ? <TextArea disabled={disabled} name={field.key} aria-label={`${labelPrefix} ${field.label}`} value={value} maxLength={field.maxLength} onChange={onChange} />
            : <Input disabled={disabled} name={field.key} aria-label={`${labelPrefix} ${field.label}`} type={field.inputType ?? 'text'} value={value} maxLength={field.maxLength} onChange={onChange} />}
    </FormField>
}
