import { useMemo, useState } from "react";
import type { Booking, BookingStatus } from "@/types/equipment";

// ─── Filter / Sort state ───────────────────────────────

export type BookingSortField = "checkedOutDate" | "equipmentName" | "bookedBy";
export type SortDirection = "asc" | "desc";

export type BookingFilters = {
  search: string;
  statuses: Set<BookingStatus>;
  sortField: BookingSortField;
  sortDirection: SortDirection;
};

const defaultFilters: BookingFilters = {
  search: "",
  statuses: new Set<BookingStatus>(["booked", "checked_out"]),
  sortField: "checkedOutDate",
  sortDirection: "desc",
};

// ─── Hook ──────────────────────────────────────────────

export function useBookingFilters(bookings: Booking[]) {
  const [filters, setFilters] = useState<BookingFilters>(defaultFilters);

  const filtered = useMemo(() => {
    let result = bookings;

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.equipmentName.toLowerCase().includes(q) ||
          b.bookedBy.toLowerCase().includes(q) ||
          b.notes.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (filters.statuses.size > 0) {
      result = result.filter((b) => filters.statuses.has(b.status));
    }

    // Sort
    const dir = filters.sortDirection === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (filters.sortField) {
        case "checkedOutDate":
          return dir * (new Date(a.checkedOutDate).getTime() - new Date(b.checkedOutDate).getTime());
        case "equipmentName":
          return dir * a.equipmentName.localeCompare(b.equipmentName);
        case "bookedBy":
          return dir * a.bookedBy.localeCompare(b.bookedBy);
      }
    });

    return result;
  }, [bookings, filters]);

  // ─── Actions ─────────────────────────────────────────

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search }));
  }

  function toggleStatus(status: BookingStatus) {
    setFilters((f) => {
      const next = new Set(f.statuses);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { ...f, statuses: next };
    });
  }

  function setSort(field: BookingSortField, direction: SortDirection) {
    setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }));
  }

  function reset() {
    setFilters(defaultFilters);
  }

  const hasActiveFilters =
    filters.statuses.size !== defaultFilters.statuses.size ||
    [...filters.statuses].some((s) => !defaultFilters.statuses.has(s));

  return {
    filters,
    filtered,
    hasActiveFilters,
    setSearch,
    toggleStatus,
    setSort,
    reset,
  };
}
