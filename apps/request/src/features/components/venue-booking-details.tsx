import { Input } from '@moc/ui/components/form/input'
import { Select } from '@moc/ui/components/form/select'
import { FormField } from '@moc/ui/components/form/form-label'
import { DateSlotPicker } from '@moc/ui/components/form/date-slot-picker'
import { VENUE_EVENT_OTHER_ID } from '@moc/types/venues'
import { CalendarX } from 'lucide-react'
import { FieldError } from '@/features/components/field-error'
import { isPastCalendarDay, parseCalendarDateKey } from '@/lib/utils'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import type { VenueBookingFormData, VenueBookingTextField } from '@/types/venue-booking'
import type { VenueSlotOption } from '@/features/hooks/use-venue-availability'
import type { PublicVenue, PublicVenueEvent } from '@moc/types/venues'
import type { ChangeEvent } from 'react'

type VenueBookingDetailsProps = {
  data: VenueBookingFormData
  venues: PublicVenue[]
  events: PublicVenueEvent[]
  listsLoading: boolean
  slots: VenueSlotOption[]
  slotsLoading: boolean
  onChange: (field: VenueBookingTextField, value: string) => void
  onVenueChange: (venueId: string) => void
  onEventChange: (eventId: string) => void
  onDateChange: (date: Date) => void
  onSlotsChange: (slotStarts: string[]) => void
  errors: StepValidationErrors
}

export function VenueBookingDetails({
  data,
  venues,
  events,
  listsLoading,
  slots,
  slotsLoading,
  onChange,
  onVenueChange,
  onEventChange,
  onDateChange,
  onSlotsChange,
  errors,
}: VenueBookingDetailsProps) {
  const selectedDate = parseCalendarDateKey(data.bookingDate)
  const isOtherEvent = data.eventId === VENUE_EVENT_OTHER_ID
  // The date is pre-set to today, so the venue is the only thing standing
  // between arriving on this step and seeing times.
  const hasVenueAndDate = Boolean(data.venueId && data.bookingDate)

  const eventItems = [
    ...events.map((event) => ({ label: event.name, value: event.id })),
    { label: 'Other', value: VENUE_EVENT_OTHER_ID },
  ]

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.name as VenueBookingTextField, event.target.value)
  }

  function handleVenueChange(value: string | null) {
    onVenueChange(value ?? '')
  }

  function handleEventChange(value: string | null) {
    onEventChange(value ?? '')
  }

  function renderVenueOption(venue: PublicVenue) {
    return <Select.Item key={venue.id} value={venue.id}>{venue.name}</Select.Item>
  }

  function renderEventOption(event: PublicVenueEvent) {
    return <Select.Item key={event.id} value={event.id}>{event.name}</Select.Item>
  }

  function renderSlot(slot: VenueSlotOption) {
    return <DateSlotPicker.Slot key={slot.id} id={slot.id} label={slot.label} available={slot.available} />
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField label="Requested by" htmlFor="requested-by" required>
        <Input id="requested-by" aria-label="Requested by" aria-invalid={Boolean(errors['requested-by']) || undefined} aria-describedby={errors['requested-by'] ? 'requested-by-error' : undefined} name="requestedBy" autoComplete="name" placeholder="Who is booking this venue?" value={data.requestedBy} onChange={handleInputChange} required />
        <FieldError id="requested-by-error" message={errors['requested-by']} />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Venue" htmlFor="venue" required>
          <Select.Root name="venue" items={venues.map((venue) => ({ label: venue.name, value: venue.id }))} value={data.venueId || null} onValueChange={handleVenueChange} disabled={listsLoading}>
            <Select.Trigger id="venue" aria-label="Venue" placeholder={listsLoading ? 'Loading…' : 'Choose a venue'} aria-invalid={Boolean(errors.venue) || undefined} aria-describedby={errors.venue ? 'venue-error' : undefined} />
            <Select.Content>{venues.map(renderVenueOption)}</Select.Content>
          </Select.Root>
          <FieldError id="venue-error" message={errors.venue} />
        </FormField>

        <FormField label="Event" htmlFor="event" required>
          <Select.Root name="event" items={eventItems} value={data.eventId || null} onValueChange={handleEventChange} disabled={listsLoading}>
            <Select.Trigger id="event" aria-label="Event" placeholder={listsLoading ? 'Loading…' : 'Choose an event'} aria-invalid={Boolean(errors.event) || undefined} aria-describedby={errors.event ? 'event-error' : undefined} />
            <Select.Content>
              {events.map(renderEventOption)}
              <Select.Item value={VENUE_EVENT_OTHER_ID}>Other</Select.Item>
            </Select.Content>
          </Select.Root>
          <FieldError id="event-error" message={errors.event} />
        </FormField>
      </div>

      {isOtherEvent && (
        <FormField label="What is the event?" htmlFor="event-other" required>
          <Input id="event-other" aria-label="What is the event?" aria-invalid={Boolean(errors['event-other']) || undefined} aria-describedby={errors['event-other'] ? 'event-other-error' : undefined} name="eventOther" autoComplete="off" placeholder="e.g. Choir auditions" maxLength={120} value={data.eventOther} onChange={handleInputChange} required />
          <FieldError id="event-other-error" message={errors['event-other']} />
        </FormField>
      )}

      <div className="flex flex-col gap-1.5">
        <DateSlotPicker.Root selectedDate={selectedDate} onSelectDate={onDateChange} slots={slots} selectedSlotIds={data.slotStarts} onSelectedSlotIdsChange={onSlotsChange}>
          <DateSlotPicker.Calendar isDateDisabled={isPastCalendarDay} />
          <DateSlotPicker.Slots>
            {slotsLoading && <DateSlotPicker.Loading label="Loading times" />}
            {!slotsLoading && !hasVenueAndDate && (
              <DateSlotPicker.Empty icon={<CalendarX />} title="Choose a venue" description="Time slots appear as soon as a venue is selected." />
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
