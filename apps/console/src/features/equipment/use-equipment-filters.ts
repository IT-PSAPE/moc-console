import { useMemo, useState } from "react";
import type { Equipment } from "@moc/types/equipment/equipment";
import type { EquipmentCategory } from "@moc/types/equipment/category";
import type { EquipmentStatus } from "@moc/types/equipment/status";
import { areSetsEqual } from "@/utils/sets";
import { useQueryText } from "@/hooks/use-query-text";

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "name" | "lastActiveDate" | "category";
export type SortDirection = "asc" | "desc";

export type EquipmentFilters = {
  search: string;
  categories: Set<EquipmentCategory>;
  statuses: Set<EquipmentStatus>;
  sortField: SortField;
  sortDirection: SortDirection;
};

const defaultFilters: EquipmentFilters = {
  search: "",
  categories: new Set(),
  statuses: new Set<EquipmentStatus>(["available", "booked"]),
  sortField: "lastActiveDate",
  sortDirection: "desc",
};

// ─── Hook ──────────────────────────────────────────────

export function useEquipmentFilters(equipment: Equipment[]) {
  const [filterState, setFilters] = useState<EquipmentFilters>(defaultFilters);
  const [search, setSearchQuery] = useQueryText();
  const filters = useMemo(() => ({ ...filterState, search }), [filterState, search]);

  const filtered = useMemo(() => {
    let result = equipment;

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.serialNumber.toLowerCase().includes(q) ||
          (e.bookedBy && e.bookedBy.toLowerCase().includes(q)),
      );
    }

    // Category filter
    if (filters.categories.size > 0) {
      result = result.filter((e) => filters.categories.has(e.category));
    }

    // Status filter
    result = result.filter((e) => filters.statuses.has(e.status));

    // Sort
    const dir = filters.sortDirection === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (filters.sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "lastActiveDate":
          return dir * (new Date(a.lastActiveDate).getTime() - new Date(b.lastActiveDate).getTime());
        case "category":
          return dir * a.category.localeCompare(b.category);
      }
    });

    return result;
  }, [equipment, filters]);

  // ─── Actions ─────────────────────────────────────────

  function setSearch(search: string) {
    setSearchQuery(search);
  }

  function toggleCategory(category: EquipmentCategory) {
    setFilters((f) => {
      const next = new Set(f.categories);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return { ...f, categories: next };
    });
  }

  function toggleStatus(status: EquipmentStatus) {
    setFilters((f) => {
      const next = new Set(f.statuses);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { ...f, statuses: next };
    });
  }

  function setSort(field: SortField, direction: SortDirection) {
    setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }));
  }

  function reset() {
    setFilters(defaultFilters);
    setSearchQuery("");
  }

  const hasActiveFilters = filters.categories.size > 0 || !areSetsEqual(filters.statuses, defaultFilters.statuses);

  return {
    filters,
    filtered,
    hasActiveFilters,
    setSearch,
    toggleCategory,
    toggleStatus,
    setSort,
    reset,
  };
}
