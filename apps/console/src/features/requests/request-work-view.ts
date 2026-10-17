import type { Request } from "@moc/types/requests";
import { getBrowserTimeZone } from "@moc/utils/browser-date-time";
import { parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time";

export type RequestWorkView = "all" | "assigned" | "due-soon" | "attention";

export function getRequestWorkViewLoadingState(view: RequestWorkView, isLoading: boolean, isInitialLoading: boolean) {
  return {
    isLoading: view === "assigned" && isLoading,
    // Assignment data is part of the Requests page's initial readiness, even
    // when another view is selected. Once loaded, switching views is instant.
    isInitialLoading,
  };
}

function calendarDay(value: string | Date, timezone: string): number | null {
  let instant: Date;
  if (value instanceof Date) {
    instant = value;
  } else {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        const validationDate = new Date(Date.UTC(year, month - 1, day));
        if (validationDate.getUTCFullYear() !== year || validationDate.getUTCMonth() !== month - 1 || validationDate.getUTCDate() !== day) return null;
        instant = new Date(parseDateTimeInputToUtcIso(`${value}T00:00`, timezone));
      } else {
        instant = new Date(value);
      }
    } catch {
      return null;
    }
  }
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? Date.UTC(year, month - 1, day) : null;
}

function isOpenRequest(request: Request): boolean {
  return request.status !== "completed" && request.status !== "archived";
}

export function filterRequestsForWorkView(requests: Request[], view: RequestWorkView, assignedIds: ReadonlySet<string>, now = new Date(), timezone = getBrowserTimeZone()): Request[] {
  if (view === "all") return requests;

  const today = calendarDay(now, timezone);
  if (today === null) return [];
  const nextWeek = today + 7 * 24 * 60 * 60 * 1000;

  return requests.filter((request) => {
    if (!isOpenRequest(request)) return false;
    if (view === "assigned") return assignedIds.has(request.id);

    const dueDay = calendarDay(request.dueDate, timezone);
    if (dueDay === null) return false;
    if (view === "due-soon") return dueDay >= today && dueDay < nextWeek;
    return dueDay < today;
  });
}
