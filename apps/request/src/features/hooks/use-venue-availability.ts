import { useEffect, useState } from 'react'
import { fetchPublicVenues } from '@/data/fetch-venues'
import { fetchVenueAvailability } from '@/data/fetch-venue-availability'
import { formatTime } from '@/lib/utils'
import type { PublicVenue } from '@moc/types/venues'
import type { VenueAvailabilitySlot } from '@/types/venue-booking'

export type VenueSlotOption = {
  id: string
  label: string
  available: boolean
}

type SlotsState = {
  slots: VenueSlotOption[]
  timeZone: string | null
  error: string | null
  settledKey: string | null
}

function toSlotOption(slot: VenueAvailabilitySlot): VenueSlotOption {
  return { id: slot.slotStart, label: formatTime(slot.slotStart, slot.timeZone), available: slot.available }
}

// Every row of one response reports the same workspace zone, so the first row
// speaks for the grid.
function gridTimeZone(slots: VenueAvailabilitySlot[]): string | null {
  return slots[0]?.timeZone ?? null
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

// Loads the venue list once, then reloads the selected day's slot grid
// whenever the chosen venue or date changes. Components read this instead of
// fetching directly. Loading state is derived from whether the last
// settled fetch matches the current (venueId, bookingDate) key, rather than
// toggled with a synchronous setState at the top of the effect.
export function useVenueAvailability(venueId: string, bookingDate: string) {
  const [venues, setVenues] = useState<PublicVenue[]>([])
  const [venuesLoading, setVenuesLoading] = useState(true)
  const [venuesError, setVenuesError] = useState<string | null>(null)

  const [slotsState, setSlotsState] = useState<SlotsState>({ slots: [], timeZone: null, error: null, settledKey: null })
  const slotsKey = `${venueId}::${bookingDate}`

  useEffect(() => {
    let cancelled = false

    fetchPublicVenues()
      .then((result) => {
        if (!cancelled) setVenues(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setVenuesError(getErrorMessage(err, 'Failed to load venues'))
      })
      .finally(() => {
        if (!cancelled) setVenuesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!venueId || !bookingDate) return

    let cancelled = false
    const requestedKey = slotsKey

    fetchVenueAvailability(venueId, bookingDate)
      .then((result) => {
        if (!cancelled) setSlotsState({ slots: result.map(toSlotOption), timeZone: gridTimeZone(result), error: null, settledKey: requestedKey })
      })
      .catch((err: unknown) => {
        if (!cancelled) setSlotsState({ slots: [], timeZone: null, error: getErrorMessage(err, 'Failed to load availability'), settledKey: requestedKey })
      })

    return () => {
      cancelled = true
    }
  }, [venueId, bookingDate, slotsKey])

  const hasVenueAndDate = Boolean(venueId && bookingDate)
  const slotsCurrent = slotsState.settledKey === slotsKey
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null

  return {
    state: {
      venues,
      venuesLoading,
      venuesError,
      selectedVenue,
      slots: slotsCurrent ? slotsState.slots : [],
      timeZone: slotsCurrent ? slotsState.timeZone : null,
      slotsLoading: hasVenueAndDate && !slotsCurrent,
      slotsError: slotsCurrent ? slotsState.error : null,
    },
  }
}
