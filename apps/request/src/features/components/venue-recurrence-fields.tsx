import { Checkbox } from '@moc/ui/components/form/checkbox'
import { Input } from '@moc/ui/components/form/input'
import { FormField, FormLabel } from '@moc/ui/components/form/form-label'
import { Select } from '@moc/ui/components/form/select'
import { Paragraph } from '@moc/ui/components/display/text'
import { FieldError } from '@/features/components/field-error'
import { inferVenueRecurrencePreset, venueRecurrencePresetItems, type VenueRecurrenceAction, type VenueRecurrencePreset } from '@/features/venue-recurrence'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import type { VenueRecurrence, VenueRecurrenceEnd, VenueRecurrenceFrequency } from '@moc/types/venues'
import type { ChangeEvent } from 'react'

const frequencyItems: Array<{ label: string; value: VenueRecurrenceFrequency }> = [
  { label: 'day', value: 'day' },
  { label: 'week', value: 'week' },
  { label: 'month', value: 'month' },
]

const weekdays = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 7 },
]

type VenueRecurrenceFieldsProps = {
  value: VenueRecurrence | null
  bookingDate: string
  errors: StepValidationErrors
  onChange: (action: VenueRecurrenceAction) => void
}

export function VenueRecurrenceFields({ value, bookingDate, errors, onChange }: VenueRecurrenceFieldsProps) {
  const preset = inferVenueRecurrencePreset(value)

  function handlePresetChange(next: string | null) {
    onChange({ type: 'preset', preset: (next ?? 'none') as VenueRecurrencePreset })
  }

  function handleFrequencyChange(next: string | null) {
    if (next) onChange({ type: 'frequency', frequency: next as VenueRecurrenceFrequency })
  }

  function handleIntervalChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({ type: 'interval', interval: Number(event.target.value) || 1 })
  }

  function handleWeekdayChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({ type: 'weekday', weekday: Number(event.target.value) })
  }

  function handleEndTypeChange(next: string | null) {
    if (next) onChange({ type: 'end-type', endType: next as VenueRecurrenceEnd['type'] })
  }

  function handleEndDateChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({ type: 'end-date', date: event.target.value })
  }

  function handleEndCountChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({ type: 'end-count', count: Number(event.target.value) || 2 })
  }

  function renderPreset(item: (typeof venueRecurrencePresetItems)[number]) {
    return <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>
  }

  function renderFrequency(item: (typeof frequencyItems)[number]) {
    return <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>
  }

  function renderWeekday(item: (typeof weekdays)[number]) {
    return (
      <Checkbox key={item.value} value={String(item.value)} checked={value?.weekdays.includes(item.value) ?? false} onChange={handleWeekdayChange}>
        <Paragraph.xs>{item.label}</Paragraph.xs>
      </Checkbox>
    )
  }

  const endItems: Array<{ label: string; value: VenueRecurrenceEnd['type'] }> = [
    { label: `At the end of ${bookingDate.slice(0, 4)}`, value: 'year_end' },
    { label: 'On', value: 'date' },
    { label: 'After', value: 'count' },
  ]

  function renderEnd(item: (typeof endItems)[number]) {
    return <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>
  }

  return (
    <section className="flex flex-col gap-4 border-t border-secondary pt-5">
      <FormField label="Repeat" htmlFor="venue-repeat">
        <Select.Root name="venue-repeat" items={venueRecurrencePresetItems} value={preset} onValueChange={handlePresetChange}>
          <Select.Trigger id="venue-repeat" aria-label="Repeat booking" />
          <Select.Content>{venueRecurrencePresetItems.map(renderPreset)}</Select.Content>
        </Select.Root>
      </FormField>

      {value && preset === 'custom' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <FormField label="Repeat every" htmlFor="recurrence-interval">
              <Input id="recurrence-interval" aria-label="Repeat interval" aria-invalid={Boolean(errors.recurrence)} aria-describedby={errors.recurrence ? 'recurrence-error' : undefined} type="number" min={1} max={365} value={value.interval} onChange={handleIntervalChange} />
            </FormField>
            <FormField label="Period" htmlFor="recurrence-frequency">
              <Select.Root name="recurrence-frequency" items={frequencyItems} value={value.frequency} onValueChange={handleFrequencyChange}>
                <Select.Trigger id="recurrence-frequency" aria-label="Repeat period" aria-invalid={Boolean(errors.recurrence)} aria-describedby={errors.recurrence ? 'recurrence-error' : undefined} />
                <Select.Content>{frequencyItems.map(renderFrequency)}</Select.Content>
              </Select.Root>
            </FormField>
          </div>
          {value.frequency === 'week' && (
            <div className="flex flex-col gap-2">
              <FormLabel label="Repeat on" />
              <div className="flex flex-wrap gap-x-4 gap-y-1">{weekdays.map(renderWeekday)}</div>
            </div>
          )}
          <FieldError id="recurrence-error" message={errors.recurrence} />
        </div>
      )}

      {value && (
        <div className="flex flex-col gap-2">
          <FormLabel label="Ends" />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Select.Root name="recurrence-end" items={endItems} value={value.end?.type ?? null} onValueChange={handleEndTypeChange}>
              <Select.Trigger aria-label="Recurrence end" aria-invalid={Boolean(errors['recurrence-end'])} aria-describedby={errors['recurrence-end'] ? 'recurrence-end-error' : undefined} placeholder="Select when it ends" />
              <Select.Content>{endItems.map(renderEnd)}</Select.Content>
            </Select.Root>
            {value.end?.type === 'date' && (
              <Input aria-label="Recurrence end date" aria-invalid={Boolean(errors['recurrence-end'])} aria-describedby={errors['recurrence-end'] ? 'recurrence-end-error' : undefined} type="date" min={bookingDate} value={value.end.date} onChange={handleEndDateChange} />
            )}
            {value.end?.type === 'count' && (
              <div className="grid grid-cols-[minmax(0,8rem)_auto] items-center gap-3">
                <Input aria-label="Number of occurrences" aria-invalid={Boolean(errors['recurrence-end'])} aria-describedby={errors['recurrence-end'] ? 'recurrence-end-error' : undefined} type="number" min={2} max={366} value={value.end.count} onChange={handleEndCountChange} />
                <Paragraph.sm className="text-secondary">occurrences</Paragraph.sm>
              </div>
            )}
          </div>
          <FieldError id="recurrence-end-error" message={errors['recurrence-end']} />
        </div>
      )}
    </section>
  )
}
