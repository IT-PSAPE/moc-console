import { useQuery } from '@tanstack/react-query'
import { fetchPublicVenues } from '@/data/fetch-venues'
import { fetchPublicVenueEvents } from '@/data/fetch-venue-events'
import { fetchVenueAvailability } from '@/data/fetch-venue-availability'
import { workspaceId } from '@/lib/workspace'
import { formatTime } from '@/lib/utils'
import type { PublicVenue, PublicVenueEvent } from '@moc/types/venues'
import type { VenueAvailabilitySlot } from '@/types/venue-booking'

export type VenueSlotOption = { id: string; label: string; available: boolean }

export const publicVenueListsQueryKey = ['public', workspaceId, 'venue-lists'] as const
export const publicVenueAvailabilityQueryKey = (venueId: string, bookingDate: string) =>
  ['public', workspaceId, 'venue-availability', venueId, bookingDate] as const

function toSlotOption(slot: VenueAvailabilitySlot, reservedSlots: ReadonlySet<string>): VenueSlotOption {
  return { id: slot.slotStart, label: formatTime(slot.slotStart, slot.timeZone), available: slot.available || reservedSlots.has(slot.slotStart) }
}

function gridTimeZone(slots: VenueAvailabilitySlot[]): string | null {
  return slots[0]?.timeZone ?? null
}

function getErrorMessage(error: unknown, fallback: string): string | null {
  return error instanceof Error ? error.message : error ? fallback : null
}

export function useVenueAvailability(venueId: string, bookingDate: string, reservedSlotStarts: string[] = []) {
  const lists = useQuery({
    queryKey: publicVenueListsQueryKey,
    queryFn: async (): Promise<{ venues: PublicVenue[]; events: PublicVenueEvent[] }> => {
      const [venues, events] = await Promise.all([fetchPublicVenues(), fetchPublicVenueEvents()])
      return { venues, events }
    },
    staleTime: 5 * 60_000,
  })
  const availability = useQuery({
    queryKey: publicVenueAvailabilityQueryKey(venueId, bookingDate),
    queryFn: () => fetchVenueAvailability(venueId, bookingDate),
    enabled: Boolean(venueId && bookingDate),
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })
  const venues = lists.data?.venues ?? []
  const events = lists.data?.events ?? []
  const slots = availability.data ?? []
  const reservedSlots = new Set(reservedSlotStarts)
  const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null

  function retryLists() {
    return lists.refetch()
  }

  function retrySlots() {
    return availability.refetch()
  }

  return {
    state: {
      venues,
      events,
      listsLoading: lists.isPending,
      listsError: lists.data === undefined ? getErrorMessage(lists.error, 'Failed to load venues') : null,
      selectedVenue,
      slots: slots.map((slot) => toSlotOption(slot, reservedSlots)),
      timeZone: availability.data ? gridTimeZone(availability.data) : null,
      slotsLoading: Boolean(venueId && bookingDate) && availability.isPending,
      slotsError: availability.data === undefined ? getErrorMessage(availability.error, 'Failed to load availability') : null,
    },
    actions: { retryLists, retrySlots },
  }
}
