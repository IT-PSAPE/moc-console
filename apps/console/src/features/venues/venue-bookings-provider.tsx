import { fetchVenueBookings } from '@/data/fetch-venue-bookings'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useWorkspace } from '@/lib/workspace-context'
import type { VenueBooking } from '@moc/types/venues'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

type VenueBookingsContextValue = {
    state: {
        bookings: VenueBooking[]
        isLoading: boolean
        isInitialLoading: boolean
        error: Error | null
        /**
         * One instant shared by every list/kanban/calendar render pass, so
         * deriveVenueBookingPhase never disagrees across rows mid-render. It
         * refreshes whenever the underlying data reloads.
         */
        at: Date
    }
    actions: {
        loadBookings: () => Promise<void>
        retryBookings: () => Promise<void>
        syncVenueBooking: (booking: VenueBooking) => void
    }
}

const VenueBookingsContext = createContext<VenueBookingsContextValue | null>(null)
const emptyBookings: VenueBooking[] = []

export function VenueBookingsProvider({ children }: { children: ReactNode }) {
    const { currentWorkspaceId } = useWorkspace()
    const { data: bookings, error, isLoading, isInitialLoading, load, updateData, setDetailData } = useWorkspaceResource({ deferInitialLoad: true, emptyValue: emptyBookings, fetcher: fetchVenueBookings, resource: 'venue-bookings', workspaceId: currentWorkspaceId })

    const loadBookings = useCallback(async () => {
        await load()
    }, [load])

    const retryBookings = useCallback(async () => {
        await load(true)
    }, [load])

    const syncVenueBooking = useCallback((booking: VenueBooking) => {
        updateData((bookings) => {
            const exists = bookings.some((entry) => entry.id === booking.id)
            return exists ? bookings.map((entry) => entry.id === booking.id ? booking : entry) : [booking, ...bookings]
        })
        setDetailData(booking.id, booking)
    }, [setDetailData, updateData])

    // `at` is constructed inline so it refreshes whenever this memo does —
    // i.e. whenever the underlying data reloads or changes — without adding
    // a dependency the callback never reads.
    const value = useMemo<VenueBookingsContextValue>(() => ({
        state: { bookings, isLoading, isInitialLoading, error, at: new Date() },
        actions: { loadBookings, retryBookings, syncVenueBooking },
    }), [bookings, error, isInitialLoading, isLoading, loadBookings, retryBookings, syncVenueBooking])

    return <VenueBookingsContext.Provider value={value}>{children}</VenueBookingsContext.Provider>
}

export function useVenueBookings() {
    const context = useContext(VenueBookingsContext)

    if (!context) {
        throw new Error('useVenueBookings must be used within a VenueBookingsProvider')
    }

    return context
}
