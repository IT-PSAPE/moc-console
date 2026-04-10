import { useMemo, useState } from "react";
import type { Request } from "@/types/requests";
import type { Category } from "@/types/requests/category";
import type { Priority } from "@/types/requests/priority";

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "title" | "dueDate" | "createdAt" | "category";
export type SortDirection = "asc" | "desc";

export type RequestFilters = {
    search: string;
    categories: Set<Category>;
    priorities: Set<Priority>;
    dateRange: { start: string; end: string };
    sortField: SortField;
    sortDirection: SortDirection;
};

const defaultFilters: RequestFilters = {
    search: "",
    categories: new Set(),
    priorities: new Set(),
    dateRange: { start: "", end: "" },
    sortField: "createdAt",
    sortDirection: "desc",
};

// ─── Hook ──────────────────────────────────────────────

export function useRequestFilters(requests: Request[]) {
    const [filters, setFilters] = useState<RequestFilters>(defaultFilters);

    const filtered = useMemo(() => {
        let result = requests;

        // Search
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(
                (r) =>
                    r.title.toLowerCase().includes(q) ||
                    r.what.toLowerCase().includes(q) ||
                    r.who.toLowerCase().includes(q),
            );
        }

        // Category filter
        if (filters.categories.size > 0) {
            result = result.filter((r) => filters.categories.has(r.category));
        }

        // Priority filter
        if (filters.priorities.size > 0) {
            result = result.filter((r) => filters.priorities.has(r.priority));
        }

        // Date range
        if (filters.dateRange.start) {
            const start = new Date(filters.dateRange.start);
            result = result.filter((r) => r.dueDate && new Date(r.dueDate) >= start);
        }
        if (filters.dateRange.end) {
            const end = new Date(filters.dateRange.end);
            result = result.filter((r) => r.dueDate && new Date(r.dueDate) <= end);
        }

        // Sort
        const dir = filters.sortDirection === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
            switch (filters.sortField) {
                case "title":
                    return dir * a.title.localeCompare(b.title);
                case "dueDate": {
                    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    return dir * (da - db);
                }
                case "createdAt":
                    return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                case "category":
                    return dir * a.category.localeCompare(b.category);
            }
        });

        return result;
    }, [requests, filters]);

    // ─── Actions ───────────────────────────────────────

    function setSearch(search: string) {
        setFilters((f) => ({ ...f, search }));
    }

    function toggleCategory(category: Category) {
        setFilters((f) => {
            const next = new Set(f.categories);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return { ...f, categories: next };
        });
    }

    function togglePriority(priority: Priority) {
        setFilters((f) => {
            const next = new Set(f.priorities);
            if (next.has(priority)) next.delete(priority);
            else next.add(priority);
            return { ...f, priorities: next };
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
    }

    const hasActiveFilters =
        filters.categories.size > 0 ||
        filters.priorities.size > 0 ||
        filters.dateRange.start !== "" ||
        filters.dateRange.end !== "";

    return {
        filters,
        filtered,
        hasActiveFilters,
        setSearch,
        toggleCategory,
        togglePriority,
        setDateRange,
        setSort,
        reset,
    };
}
