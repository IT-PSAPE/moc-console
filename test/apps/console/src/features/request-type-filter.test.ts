import { describe, expect, test } from "vitest";
import type { Request } from "@moc/types/requests";
import { filterRequestsByType, hasRequestResettableState, selectRequestFiltersForWorkspace, type RequestFilters } from "../../../../../apps/console/src/features/requests/use-request-filters";

function makeRequest(id: string, category: string, categoryName: string): Request {
  return {
    id,
    title: id,
    priority: "medium",
    status: "in_progress",
    category,
    categoryName,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    dueDate: "2026-10-15T10:00:00.000Z",
    requestedBy: "Alex",
    who: "crew",
    what: "task",
    when: "soon",
    where: "hall",
    why: "needed",
    how: "complete",
  };
}

describe("request type filtering", () => {
  const requests = [makeRequest("event-request", "event", "Event"), makeRequest("renamed-event", "event", "Festival"), makeRequest("equipment-request", "equipment", "Equipment")];

  test("filters by the stable type key even when display names have been renamed", () => {
    expect(filterRequestsByType(requests, "event").map((request) => request.id)).toEqual(["event-request", "renamed-event"]);
  });

  test("clearing the type filter returns the full collection", () => {
    expect(filterRequestsByType(requests, null)).toBe(requests);
  });

  test("shows reset when only search or sort differs from defaults", () => {
    const defaults: RequestFilters = {
      search: "",
      category: null,
      priorities: new Set(),
      statuses: new Set(["not_started", "in_progress"]),
      dateRange: { start: "", end: "" },
      sortField: "createdAt",
      sortDirection: "desc",
    };

    expect(hasRequestResettableState({ ...defaults, search: "budget" }, false, "all")).toBe(true);
    expect(hasRequestResettableState({ ...defaults, sortField: "title", sortDirection: "asc" }, false, "all")).toBe(true);
    expect(hasRequestResettableState(defaults, false, "all")).toBe(false);
  });

  test("keeps selected custom types scoped to their workspace", () => {
    const workspaceFilters: Record<string, RequestFilters> = {
      workspaceA: {
        search: "",
        category: "custom-type-a",
        priorities: new Set(),
        statuses: new Set(["not_started", "in_progress"]),
        dateRange: { start: "", end: "" },
        sortField: "createdAt",
        sortDirection: "desc",
      },
    };

    expect(selectRequestFiltersForWorkspace(workspaceFilters, "workspaceA").category).toBe("custom-type-a");
    expect(selectRequestFiltersForWorkspace(workspaceFilters, "workspaceB").category).toBeNull();
  });
});
