import { fetchVenueBookingById, fetchVenueBookings } from '@/data/fetch-venue-bookings'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useWorkspace } from '@/lib/workspace-context'
import type { VenueBooking } from '@moc/types/venues'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type VenueBookingsContextValue = {
    state: {
        bookings: VenueBooking[]
        bookingsById: Record<string, VenueBooking>
        isLoading: boolean
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
        loadBooking: (id: string) => Promise<void>
        syncVenueBooking: (booking: VenueBooking) => void
    }
}

const VenueBookingsContext = createContext<VenueBookingsContextValue | null>(null)
const emptyBookings: VenueBooking[] = []

function mergeBookings(previous: Record<string, VenueBooking>, bookings: VenueBooking[]) {
    const next = { ...previous }

    for (const booking of bookings) {
        next[booking.id] = booking
    }

    return next
}

export function VenueBookingsProvider({ children }: { children: ReactNode }) {
    const { currentWorkspaceId } = useWorkspace()
    const { data, error, isLoading, load, updateData } = useWorkspaceResource({ emptyValue: emptyBookings, fetcher: fetchVenueBookings, resource: 'venue-bookings', workspaceId: currentWorkspaceId })
    const [detailBookingsByWorkspace, setDetailBookingsByWorkspace] = useState<Record<string, Record<string, VenueBooking>>>({})

    const bookingsById = useMemo(() => {
        const detailBookings = currentWorkspaceId ? detailBookingsByWorkspace[currentWorkspaceId] ?? {} : {}
        return { ...mergeBookings({}, data), ...detailBookings }
    }, [currentWorkspaceId, data, detailBookingsByWorkspace])

    const loadBookings = useCallback(async () => {
        await load()
    }, [load])

    const retryBookings = useCallback(async () => {
        await load(true)
    }, [load])

    const syncVenueBooking = useCallback((booking: VenueBooking) => {
        if (currentWorkspaceId) {
            setDetailBookingsByWorkspace((previous) => ({
                ...previous,
                [currentWorkspaceId]: { ...(previous[currentWorkspaceId] ?? {}), [booking.id]: booking },
            }))
        }
        updateData((bookings) => {
            const exists = bookings.some((entry) => entry.id === booking.id)
            return exists ? bookings.map((entry) => entry.id === booking.id ? booking : entry) : [booking, ...bookings]
        })
    }, [currentWorkspaceId, updateData])

    const loadBooking = useCallback(async (id: string) => {
        if (!currentWorkspaceId || bookingsById[id]) return

        const booking = await fetchVenueBookingById(id, currentWorkspaceId)
        if (!booking) return
        setDetailBookingsByWorkspace((previous) => ({
            ...previous,
            [currentWorkspaceId]: { ...(previous[currentWorkspaceId] ?? {}), [booking.id]: booking },
        }))
    }, [currentWorkspaceId, bookingsById])

    const bookings = useMemo(() => Object.values(bookingsById), [bookingsById])

    // `at` is constructed inline so it refreshes whenever this memo does —
    // i.e. whenever the underlying data reloads or changes — without adding
    // a dependency the callback never reads.
    const value = useMemo<VenueBookingsContextValue>(() => ({
        state: { bookings, bookingsById, isLoading, error, at: new Date() },
        actions: { loadBookings, retryBookings, loadBooking, syncVenueBooking },
    }), [bookings, bookingsById, error, isLoading, loadBooking, loadBookings, retryBookings, syncVenueBooking])

    return <VenueBookingsContext.Provider value={value}>{children}</VenueBookingsContext.Provider>
}

export function useVenueBookings() {
    const context = useContext(VenueBookingsContext)

    if (!context) {
        throw new Error('useVenueBookings must be used within a VenueBookingsProvider')
    }

    return context
}
