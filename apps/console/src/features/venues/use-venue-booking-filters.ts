import { useMemo, useState } from "react";
import type { VenueBooking, VenueBookingPhase } from "@moc/types/venues";
import { deriveVenueBookingPhase } from "@moc/types/venues";
import { areSetsEqual } from "@/utils/sets";
import { useQueryText } from "@/hooks/use-query-text";
import { useVenueBookings } from "./venue-bookings-provider";

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "startsAt" | "createdAt" | "title" | "venueName";
export type SortDirection = "asc" | "desc";

export type VenueBookingFilters = {
    search: string;
    phases: Set<VenueBookingPhase>;
    dateRange: { start: string; end: string };
    sortField: SortField;
    sortDirection: SortDirection;
};

const defaultFilters: VenueBookingFilters = {
    search: "",
    phases: new Set<VenueBookingPhase>(["booked", "in_progress"]),
    dateRange: { start: "", end: "" },
    sortField: "startsAt",
    sortDirection: "asc",
};

// ─── Hook ──────────────────────────────────────────────

export function useVenueBookingFilters(bookings: VenueBooking[]) {
    const { state: { at } } = useVenueBookings();
    const [filterState, setFilters] = useState<VenueBookingFilters>(defaultFilters);
    const [search, setSearchQuery] = useQueryText();
    const filters = useMemo(() => ({ ...filterState, search }), [filterState, search]);

    const results = useMemo(() => {
        let result = bookings;

        // Search
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(
                (b) =>
                    b.title.toLowerCase().includes(q) ||
                    b.venueName.toLowerCase().includes(q) ||
                    b.requestedBy.toLowerCase().includes(q) ||
                    b.trackingCode.toLowerCase().includes(q),
            );
        }

        // Date range (against the booked window's start)
        if (filters.dateRange.start) {
            const start = new Date(filters.dateRange.start);
            result = result.filter((b) => new Date(b.startsAt) >= start);
        }
        if (filters.dateRange.end) {
            const end = new Date(filters.dateRange.end);
            result = result.filter((b) => new Date(b.startsAt) <= end);
        }

        // Sort
        const dir = filters.sortDirection === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
            switch (filters.sortField) {
                case "title":
                    return dir * a.title.localeCompare(b.title);
                case "venueName":
                    return dir * a.venueName.localeCompare(b.venueName);
                case "startsAt":
                    return dir * (new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
                case "createdAt":
                    return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }
        });

        return {
            calendarFiltered: result,
            filtered: result.filter((booking) => filters.phases.has(deriveVenueBookingPhase(booking.status, booking.startsAt, booking.endsAt, at))),
        };
    }, [at, bookings, filters]);

    // ─── Actions ───────────────────────────────────────

    function setSearch(search: string) {
        setSearchQuery(search);
    }

    function togglePhase(phase: VenueBookingPhase) {
        setFilters((f) => {
            const next = new Set(f.phases);
            if (next.has(phase)) next.delete(phase);
            else next.add(phase);
            return { ...f, phases: next };
        });
    }

    function setDateRange(start: string, end: string) {
        setFilters((f) => ({ ...f, dateRange: { start, end } }));
    }

    function setSort(field: SortField, direction: SortDirection) {
        setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }));
    }

    function reset() {
        setFilters(defaultFilters);
        setSearchQuery("");
    }

    const hasActiveFilters =
        !areSetsEqual(filters.phases, defaultFilters.phases) ||
        filters.dateRange.start !== "" ||
        filters.dateRange.end !== "";

    return {
        filters,
        filtered: results.filtered,
        calendarFiltered: results.calendarFiltered,
        hasActiveFilters,
        setSearch,
        togglePhase,
        setDateRange,
        setSort,
        reset,
    };
}
