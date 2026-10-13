import { useMemo, useState, type SetStateAction } from "react";
import type { VenueBooking, VenueBookingPhase } from "@moc/types/venues";
import { deriveVenueBookingSeriesPhase } from "@moc/types/venues";
import { areSetsEqual } from "@/utils/sets";
import { useQueryText } from "@/hooks/use-query-text";
import { useVenueBookings } from "./venue-bookings-provider";
import { venueBookingOverlapsDateRange } from "./venue-booking-date-range";
import { useWorkspace } from "@/lib/workspace-context";
import { useManagedVenueEventOptions, useManagedVenueOptions } from "./use-managed-venue-option-resource";
import { matchesVenueBookingOptions } from "./venue-booking-option-filter";

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "startsAt" | "createdAt" | "title" | "venueName";
export type SortDirection = "asc" | "desc";

export type VenueBookingFilters = {
    search: string;
    venueId: string | null;
    eventId: string | null;
    phases: Set<VenueBookingPhase>;
    dateRange: { start: string; end: string };
    sortField: SortField;
    sortDirection: SortDirection;
};

const defaultFilters: VenueBookingFilters = {
    search: "",
    venueId: null,
    eventId: null,
    phases: new Set<VenueBookingPhase>(["booked", "in_progress"]),
    dateRange: { start: "", end: "" },
    sortField: "startsAt",
    sortDirection: "asc",
};

// ─── Hook ──────────────────────────────────────────────

export function useVenueBookingFilters(bookings: VenueBooking[]) {
    const { state: { at } } = useVenueBookings();
    const { role, currentWorkspaceId } = useWorkspace();
    const canManageOptions = role?.can_manage_roles === true;
    const venues = useManagedVenueOptions();
    const events = useManagedVenueEventOptions();
    const [filterStateByWorkspace, setFilterStateByWorkspace] = useState<Record<string, VenueBookingFilters>>({});
    const workspaceKey = currentWorkspaceId ?? "none";
    const filterState = filterStateByWorkspace[workspaceKey] ?? defaultFilters;
    function setFilters(nextFilterState: SetStateAction<VenueBookingFilters>) {
        setFilterStateByWorkspace((current) => {
            const currentFilters = current[workspaceKey] ?? defaultFilters;
            const next = typeof nextFilterState === "function" ? nextFilterState(currentFilters) : nextFilterState;
            return { ...current, [workspaceKey]: next };
        });
    }
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

        // A recurring series belongs in a range when any concrete occurrence
        // overlaps it. Legacy rows without embedded slots fall back to the
        // parent booking window.
        result = result.filter((booking) => venueBookingOverlapsDateRange(booking, filters.dateRange));

        result = result.filter((booking) => matchesVenueBookingOptions(booking, filters.venueId, filters.eventId));

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
            filtered: result.filter((booking) => filters.phases.has(deriveVenueBookingSeriesPhase(booking.status, booking.occurrences, at, booking))),
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

    function setVenueId(venueId: string | null) {
        setFilters((current) => ({ ...current, venueId }));
    }

    function setEventId(eventId: string | null) {
        setFilters((current) => ({ ...current, eventId }));
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
        filters.venueId !== null ||
        filters.eventId !== null ||
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
        setVenueId,
        setEventId,
        setSort,
        reset,
        options: {
            workspaceId: currentWorkspaceId,
            venues: { ...venues, canManage: canManageOptions },
            events: { ...events, canManage: canManageOptions },
        },
    };
}
