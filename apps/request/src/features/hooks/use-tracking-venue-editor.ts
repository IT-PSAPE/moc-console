import { useCallback, useState } from "react"
import { VENUE_EVENT_OTHER_ID } from "@moc/types/venues"
import { updateTrackedVenueBooking } from "@/data/tracking-submissions"
import { getVenueBookingStepErrors } from "@/features/public-flow-validation"
import { toVenueEditData } from "@/features/tracking-submission"
import { useStepValidation } from "@/features/hooks/use-step-validation"
import { useVenueAvailability } from "@/features/hooks/use-venue-availability"
import { formatCalendarDateKey } from "@/lib/utils"
import type { TrackingResult, TrackingVenueBookingResult } from "@/types/tracking"
import type { VenueBookingFormData, VenueBookingTextField } from "@/types/venue-booking"

export function useTrackingVenueEditor(result: TrackingVenueBookingResult, onSaved: (submission: TrackingResult) => void) {
  const [data, setData] = useState<VenueBookingFormData>(() => toVenueEditData(result))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const validation = useStepValidation()
  const reservedSlotStarts = data.venueId === result.venueId ? result.slotStarts : []
  const availability = useVenueAvailability(data.venueId, data.bookingDate, reservedSlotStarts)
  const venues = availability.state.venues.some((venue) => venue.id === result.venueId)
    ? availability.state.venues
    : [{ id: result.venueId, name: result.venueName, location: result.venueLocation, capacity: null }, ...availability.state.venues]
  const events = !result.eventId || availability.state.events.some((event) => event.id === result.eventId)
    ? availability.state.events
    : [{ id: result.eventId, name: result.eventName ?? result.title, description: null }, ...availability.state.events]

  const setField = useCallback((field: VenueBookingTextField, value: string) => {
    setData((current) => ({ ...current, [field]: value }))
  }, [])

  const setVenue = useCallback((venueId: string) => {
    setData((current) => ({ ...current, venueId, slotStarts: [] }))
  }, [])

  const setEvent = useCallback((eventId: string) => {
    setData((current) => ({ ...current, eventId, eventOther: eventId === VENUE_EVENT_OTHER_ID ? current.eventOther : "" }))
  }, [])

  const setBookingDate = useCallback((date: Date) => {
    setData((current) => ({ ...current, bookingDate: formatCalendarDateKey(date), slotStarts: [] }))
  }, [])

  const setSlots = useCallback((slotStarts: string[]) => {
    setData((current) => ({ ...current, slotStarts }))
  }, [])

  const save = useCallback(async () => {
    if (!validation.actions.validate(getVenueBookingStepErrors(1, data))) return

    setSaving(true)
    setError(null)
    try {
      onSaved(await updateTrackedVenueBooking(result, data))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update the venue booking")
    } finally {
      setSaving(false)
    }
  }, [data, onSaved, result, validation.actions])

  return {
    state: { data, saving, error, validationErrors: validation.state.errors, availability: { ...availability.state, venues, events } },
    actions: { setField, setVenue, setEvent, setBookingDate, setSlots, save },
  }
}
