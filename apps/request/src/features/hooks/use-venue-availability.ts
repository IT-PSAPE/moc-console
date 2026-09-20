import { useEffect, useMemo, useState } from 'react'
import { fetchPublicVenues } from '@/data/fetch-venues'
import { fetchPublicVenueEvents } from '@/data/fetch-venue-events'
import { fetchVenueAvailability } from '@/data/fetch-venue-availability'
import { formatTime } from '@/lib/utils'
import type { PublicVenue, PublicVenueEvent } from '@moc/types/venues'
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

type ListsState = {
  venues: PublicVenue[]
  events: PublicVenueEvent[]
  loading: boolean
  error: string | null
}

function toSlotOption(slot: VenueAvailabilitySlot, reservedSlots: ReadonlySet<string>): VenueSlotOption {
  return { id: slot.slotStart, label: formatTime(slot.slotStart, slot.timeZone), available: slot.available || reservedSlots.has(slot.slotStart) }
}

// Every row of one response reports the same workspace zone, so the first row
// speaks for the grid.
function gridTimeZone(slots: VenueAvailabilitySlot[]): string | null {
  return slots[0]?.timeZone ?? null
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

// Loads the venue and event lists once, then reloads the selected day's slot
// grid whenever the chosen venue or date changes. Components read this instead
// of fetching directly. Loading state is derived from whether the last
// settled fetch matches the current (venueId, bookingDate) key, rather than
// toggled with a synchronous setState at the top of the effect.
export function useVenueAvailability(venueId: string, bookingDate: string, reservedSlotStarts: string[] = []) {
  const [lists, setLists] = useState<ListsState>({ venues: [], events: [], loading: true, error: null })

  const [slotsState, setSlotsState] = useState<SlotsState>({ slots: [], timeZone: null, error: null, settledKey: null })
  const slotsKey = `${venueId}::${bookingDate}`
  const reservedSlotsKey = reservedSlotStarts.join("::")
  const reservedSlots = useMemo(() => new Set(reservedSlotsKey ? reservedSlotsKey.split("::") : []), [reservedSlotsKey])

  useEffect(() => {
    let cancelled = false

    // The two lists fill the same row of dropdowns, so they are awaited
    // together: reporting one as ready while the other is still loading would
    // only make that row settle twice.
    Promise.all([fetchPublicVenues(), fetchPublicVenueEvents()])
      .then(([venues, events]) => {
        if (!cancelled) setLists({ venues, events, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setLists({ venues: [], events: [], loading: false, error: getErrorMessage(err, 'Failed to load venues') })
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
        if (!cancelled) setSlotsState({ slots: result.map((slot) => toSlotOption(slot, reservedSlots)), timeZone: gridTimeZone(result), error: null, settledKey: requestedKey })
      })
      .catch((err: unknown) => {
        if (!cancelled) setSlotsState({ slots: [], timeZone: null, error: getErrorMessage(err, 'Failed to load availability'), settledKey: requestedKey })
      })

    return () => {
      cancelled = true
    }
  }, [venueId, bookingDate, slotsKey, reservedSlots])

  const hasVenueAndDate = Boolean(venueId && bookingDate)
  const slotsCurrent = slotsState.settledKey === slotsKey
  const selectedVenue = lists.venues.find((venue) => venue.id === venueId) ?? null

  return {
    state: {
      venues: lists.venues,
      events: lists.events,
      listsLoading: lists.loading,
      listsError: lists.error,
      selectedVenue,
      slots: slotsCurrent ? slotsState.slots : [],
      timeZone: slotsCurrent ? slotsState.timeZone : null,
      slotsLoading: hasVenueAndDate && !slotsCurrent,
      slotsError: slotsCurrent ? slotsState.error : null,
    },
  }
}
