import { useMemo, useState, type SetStateAction } from "react";
import type { Request } from "@moc/types/requests";
import type { Priority } from "@moc/types/requests/priority";
import type { Status } from "@moc/types/requests/status";
import { areSetsEqual } from "@/utils/sets";
import { useQueryText } from "@/hooks/use-query-text";
import { useWorkspace } from "@/lib/workspace-context";

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "title" | "dueDate" | "createdAt" | "category";
export type SortDirection = "asc" | "desc";

export type RequestFilters = {
    search: string;
    category: string | null;
    priorities: Set<Priority>;
    statuses: Set<Status>;
    dateRange: { start: string; end: string };
    sortField: SortField;
    sortDirection: SortDirection;
};

const defaultFilters: RequestFilters = {
    search: "",
    category: null,
    priorities: new Set(),
    statuses: new Set<Status>(["not_started", "in_progress"]),
    dateRange: { start: "", end: "" },
    sortField: "createdAt",
    sortDirection: "desc",
};

export function selectRequestFiltersForWorkspace(filtersByWorkspace: Record<string, RequestFilters>, workspaceKey: string): RequestFilters {
    return filtersByWorkspace[workspaceKey] ?? defaultFilters;
}

export function filterRequestsByType(requests: Request[], type: string | null): Request[] {
    return type ? requests.filter((request) => request.category === type) : requests;
}

export function hasRequestResettableState(filters: RequestFilters, hasActiveFilters: boolean, workView: string): boolean {
    return hasActiveFilters || filters.search !== "" || filters.sortField !== defaultFilters.sortField || filters.sortDirection !== defaultFilters.sortDirection || workView !== "all";
}

// ─── Hook ──────────────────────────────────────────────

export function useRequestFilters(requests: Request[]) {
    const { currentWorkspaceId } = useWorkspace();
    const workspaceKey = currentWorkspaceId ?? "none";
    const [filterStateByWorkspace, setFilterStateByWorkspace] = useState<Record<string, RequestFilters>>({});
    const filterState = selectRequestFiltersForWorkspace(filterStateByWorkspace, workspaceKey);
    function setFilters(nextFilterState: SetStateAction<RequestFilters>) {
        setFilterStateByWorkspace((current) => {
            const currentFilters = selectRequestFiltersForWorkspace(current, workspaceKey);
            const next = typeof nextFilterState === "function" ? nextFilterState(currentFilters) : nextFilterState;
            return { ...current, [workspaceKey]: next };
        });
    }
    const [search, setSearchQuery] = useQueryText();
    const filters = useMemo(() => ({ ...filterState, search }), [filterState, search]);

    const results = useMemo(() => {
        let result = filterRequestsByType(requests, filters.category);

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

        // Priority filter
        if (filters.priorities.size > 0) {
            result = result.filter((r) => filters.priorities.has(r.priority));
        }

        // Date range
        if (filters.dateRange.start) {
            const start = new Date(filters.dateRange.start);
            result = result.filter((r) => new Date(r.dueDate) >= start);
        }
        if (filters.dateRange.end) {
            const end = new Date(filters.dateRange.end);
            result = result.filter((r) => new Date(r.dueDate) <= end);
        }

        // Sort
        const dir = filters.sortDirection === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
            switch (filters.sortField) {
                case "title":
                    return dir * a.title.localeCompare(b.title);
                case "dueDate": {
                    const da = new Date(a.dueDate).getTime();
                    const db = new Date(b.dueDate).getTime();
                    return dir * (da - db);
                }
                case "createdAt":
                    return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                case "category":
                    return dir * a.category.localeCompare(b.category);
            }
        });

        return {
            calendarFiltered: result,
            filtered: result.filter((request) => filters.statuses.has(request.status)),
        };
    }, [requests, filters]);

    // ─── Actions ───────────────────────────────────────

    function setSearch(search: string) {
        setSearchQuery(search);
    }

    function setCategory(category: string | null) {
        setFilters((f) => ({ ...f, category }));
    }

    function togglePriority(priority: Priority) {
        setFilters((f) => {
            const next = new Set(f.priorities);
            if (next.has(priority)) next.delete(priority);
            else next.add(priority);
            return { ...f, priorities: next };
        });
    }

    function toggleStatus(status: Status) {
        setFilters((f) => {
            const next = new Set(f.statuses);
            if (next.has(status)) next.delete(status);
            else next.add(status);
            return { ...f, statuses: next };
        });
    }

    function setDateRange(start: string, end: string) {
        setFilters((f) => ({ ...f, dateRange: { start, end } }));
    }

    function setSort(field: SortField, direction: SortDirection) {
        setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }));
    }

    function reset(clearSearch = true) {
        setFilters(defaultFilters);
        if (clearSearch) setSearchQuery("");
    }

    const hasActiveFilters =
        filters.category !== null ||
        filters.priorities.size > 0 ||
        !areSetsEqual(filters.statuses, defaultFilters.statuses) ||
        filters.dateRange.start !== "" ||
        filters.dateRange.end !== "";

    // True when the current view includes archived requests, so callers know
    // they must have loaded them.
    const includesArchived = filters.statuses.has("archived");

    return {
        filters,
        filtered: results.filtered,
        calendarFiltered: results.calendarFiltered,
        hasActiveFilters,
        includesArchived,
        setSearch,
        setCategory,
        togglePriority,
        toggleStatus,
        setDateRange,
        setSort,
        reset,
    };
}
