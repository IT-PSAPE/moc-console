import { Select } from '@moc/ui/components/form/select'
import { FormField } from '@moc/ui/components/form/form-label'
import { DateSlotPicker } from '@moc/ui/components/form/date-slot-picker'
import { CalendarX } from 'lucide-react'
import { FieldError } from '@/features/components/field-error'
import { isPastCalendarDay, parseCalendarDateKey } from '@/lib/utils'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import type { VenueBookingFormData } from '@/types/venue-booking'
import type { VenueSlotOption } from '@/features/hooks/use-venue-availability'
import type { PublicVenue } from '@moc/types/venues'

type VenueBookingScheduleProps = {
  data: VenueBookingFormData
  venues: PublicVenue[]
  venuesLoading: boolean
  slots: VenueSlotOption[]
  slotsLoading: boolean
  onVenueChange: (venueId: string) => void
  onDateChange: (date: Date) => void
  onSlotsChange: (slotStarts: string[]) => void
  errors: StepValidationErrors
}

export function VenueBookingSchedule({ data, venues, venuesLoading, slots, slotsLoading, onVenueChange, onDateChange, onSlotsChange, errors }: VenueBookingScheduleProps) {
  const selectedDate = parseCalendarDateKey(data.bookingDate)
  const hasVenueAndDate = Boolean(data.venueId && data.bookingDate)

  function handleVenueChange(value: string | null) {
    onVenueChange(value ?? '')
  }

  function renderVenueOption(venue: PublicVenue) {
    return <Select.Item key={venue.id} value={venue.id}>{venue.name}</Select.Item>
  }

  function renderSlot(slot: VenueSlotOption) {
    return <DateSlotPicker.Slot key={slot.id} id={slot.id} label={slot.label} available={slot.available} />
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField label="Venue" htmlFor="venue" required>
        <Select.Root name="venue" items={venues.map((venue) => ({ label: venue.name, value: venue.id }))} value={data.venueId || null} onValueChange={handleVenueChange} disabled={venuesLoading}>
          <Select.Trigger id="venue" aria-label="Venue" placeholder={venuesLoading ? 'Loading venues…' : 'Choose a venue'} aria-invalid={Boolean(errors.venue) || undefined} aria-describedby={errors.venue ? 'venue-error' : undefined} />
          <Select.Content>{venues.map(renderVenueOption)}</Select.Content>
        </Select.Root>
        <FieldError id="venue-error" message={errors.venue} />
      </FormField>

      <div className="flex flex-col gap-1.5">
        <DateSlotPicker.Root selectedDate={selectedDate} onSelectDate={onDateChange} slots={slots} selectedSlotIds={data.slotStarts} onSelectedSlotIdsChange={onSlotsChange}>
          <DateSlotPicker.Calendar isDateDisabled={isPastCalendarDay} />
          <DateSlotPicker.Slots>
            {slotsLoading && <DateSlotPicker.Loading label="Loading times" />}
            {!slotsLoading && !hasVenueAndDate && (
              <DateSlotPicker.Empty icon={<CalendarX />} title="Choose a venue and date" description="Time slots appear once a venue and date are selected." />
            )}
            {!slotsLoading && hasVenueAndDate && slots.length === 0 && (
              <DateSlotPicker.Empty icon={<CalendarX />} title="No times available" description="Try a different date." />
            )}
            {!slotsLoading && hasVenueAndDate && slots.length > 0 && slots.map(renderSlot)}
          </DateSlotPicker.Slots>
        </DateSlotPicker.Root>
        <FieldError id="venue-slots-error" message={errors['venue-slots']} />
      </div>
    </div>
  )
}
