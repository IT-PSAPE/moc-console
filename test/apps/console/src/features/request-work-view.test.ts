import { describe, expect, test } from "vitest";
import type { Request } from "@moc/types/requests";
import { filterRequestsForWorkView, getRequestWorkViewLoadingState } from "../../../../../apps/console/src/features/requests/request-work-view";

function makeRequest(id: string, overrides: Partial<Request> = {}): Request {
  return {
    id,
    title: id,
    status: "in_progress",
    category: "event",
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
    ...overrides,
  };
}

function localDate(daysFromToday: number, now: Date): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysFromToday, 12);
  return date.toISOString();
}

describe("request work views", () => {
  const now = new Date(2026, 9, 12, 15);

  test("preloads assignment data before the page is ready but only blocks assigned view on background refresh", () => {
    expect(getRequestWorkViewLoadingState("all", true, true)).toEqual({ isLoading: false, isInitialLoading: true });
    expect(getRequestWorkViewLoadingState("assigned", true, false)).toEqual({ isLoading: true, isInitialLoading: false });
    expect(getRequestWorkViewLoadingState("all", false, false)).toEqual({ isLoading: false, isInitialLoading: false });
  });

  test("due soon includes today through six days ahead and excludes invalid, overdue, completed, archived and day-seven requests", () => {
    const requests = [
      makeRequest("today", { dueDate: localDate(0, now) }),
      makeRequest("day-six", { dueDate: localDate(6, now) }),
      makeRequest("day-seven", { dueDate: localDate(7, now) }),
      makeRequest("overdue", { dueDate: localDate(-1, now) }),
      makeRequest("invalid", { dueDate: "not-a-date" }),
      makeRequest("completed", { status: "completed", dueDate: localDate(1, now) }),
      makeRequest("archived", { status: "archived", dueDate: localDate(1, now) }),
    ];

    expect(filterRequestsForWorkView(requests, "due-soon", new Set(), now).map((request) => request.id)).toEqual(["today", "day-six"]);
  });

  test("attention includes overdue unfinished requests and skips invalid dates and closed requests", () => {
    const requests = [
      makeRequest("overdue", { dueDate: localDate(-1, now) }),
      makeRequest("future", { dueDate: localDate(2, now) }),
      makeRequest("invalid", { dueDate: "not-a-date" }),
      makeRequest("completed", { status: "completed", dueDate: localDate(2, now) }),
      makeRequest("archived-overdue", { status: "archived", dueDate: localDate(-1, now) }),
    ];

    expect(filterRequestsForWorkView(requests, "attention", new Set(), now).map((request) => request.id)).toEqual(["overdue"]);
  });

  test("assigned view matches ids and keeps completed and archived requests out", () => {
    const requests = [
      makeRequest("assigned"),
      makeRequest("completed", { status: "completed" }),
      makeRequest("archived", { status: "archived" }),
      makeRequest("unassigned"),
    ];

    expect(filterRequestsForWorkView(requests, "assigned", new Set(["assigned", "completed", "archived"]), now).map((request) => request.id)).toEqual(["assigned"]);
  });

  test("date-only due dates retain their calendar day in western timezones", () => {
    const requests = [
      makeRequest("today", { dueDate: "2026-10-12" }),
      makeRequest("day-six", { dueDate: "2026-10-18" }),
      makeRequest("day-seven", { dueDate: "2026-10-19" }),
    ];

    expect(filterRequestsForWorkView(requests, "due-soon", new Set(), new Date("2026-10-12T18:00:00.000Z"), "America/Los_Angeles").map((request) => request.id)).toEqual(["today", "day-six"]);
  });
});
