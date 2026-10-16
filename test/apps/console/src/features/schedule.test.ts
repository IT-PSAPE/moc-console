import { describe, expect, it, vi } from "vitest";
import { formatScheduleDate, formatScheduleMonth, getScheduleCalendarDates, updateScheduleDateQuery, parseScheduleDateQuery, parseScheduleItemType, parseScheduleMonth, updateScheduleMonthQuery } from "../../../../../apps/console/src/features/schedule/schedule-query";

it("uses a single Work segment and maps legacy multi-type selections to All", () => {
  expect(parseScheduleItemType(null)).toBe("all");
  expect(parseScheduleItemType("request")).toBe("request");
  expect(parseScheduleItemType("equipment")).toBe("equipment");
  expect(parseScheduleItemType("venue")).toBe("venue");
  expect(parseScheduleItemType("request,venue")).toBe("all");
  expect(parseScheduleItemType("unknown")).toBe("all");
});

describe("schedule month query", () => {
  it("keeps a selected local date when its UTC date is the previous day", () => {
    vi.stubEnv("TZ", "Pacific/Auckland");
    try {
      const date = parseScheduleDateQuery("2026-10-16", new Date(2026, 9, 1));
      expect(date.getTimezoneOffset()).toBe(-780);
      expect(date.toISOString().slice(0, 10)).toBe("2026-10-15");
      expect(formatScheduleDate(date)).toBe("2026-10-16");
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("round trips local calendar days and rejects impossible dates", () => {
    const fallback = new Date(2026, 9, 15);
    expect(formatScheduleDate(parseScheduleDateQuery("2026-10-16", fallback))).toBe("2026-10-16");
    expect(parseScheduleDateQuery("2026-02-31", fallback)).toBe(fallback);
    expect(parseScheduleDateQuery("invalid", fallback)).toBe(fallback);
    expect(parseScheduleDateQuery(null, fallback)).toBe(fallback);
  });
  it("parses URL months at year boundaries and retains other route filters when changing months", () => {
    const fallback = new Date(2026, 5, 20);
    const january = parseScheduleMonth("2027-01", fallback);
    const invalidMonth = parseScheduleMonth("2027-13", fallback);
    const nextParams = updateScheduleMonthQuery(new URLSearchParams("types=request&keep=1"), new Date(2026, 11, 31));

    expect([january.getFullYear(), january.getMonth(), january.getDate()]).toEqual([2027, 0, 1]);
    expect([invalidMonth.getFullYear(), invalidMonth.getMonth(), invalidMonth.getDate()]).toEqual([2026, 5, 1]);
    expect(formatScheduleMonth(new Date(2026, 11, 31))).toBe("2026-12");
    expect(nextParams.get("month")).toBe("2026-12");
    expect(nextParams.get("types")).toBe("request");
    expect(nextParams.get("keep")).toBe("1");
  });
});

describe("calendar date consistency", () => {
  it("aligns a legacy month-only link and clamps its selected day", () => {
    const dates = getScheduleCalendarDates(new URLSearchParams("month=2027-02"), new Date(2026, 9, 31));
    expect(formatScheduleMonth(dates.month)).toBe("2027-02");
    expect(formatScheduleDate(dates.date)).toBe("2027-02-28");
  });
  it("uses a date-only link for both the toolbar and grid", () => {
    const dates = getScheduleCalendarDates(new URLSearchParams("date=2027-12-24"), new Date(2026, 9, 16));
    expect(formatScheduleDate(dates.date)).toBe("2027-12-24");
    expect(formatScheduleMonth(dates.month)).toBe("2027-12");
  });
});

it("updates a selected overflow date without losing Work filters", () => {
  const params = updateScheduleDateQuery(new URLSearchParams("view=month&types=request&categories=photo&workScope=workspace-1"), new Date(2027, 1, 1));
  expect(params.get("date")).toBe("2027-02-01");
  expect(params.get("month")).toBe("2027-02");
  expect(params.get("types")).toBe("request");
  expect(params.get("categories")).toBe("photo");
  expect(params.get("workScope")).toBe("workspace-1");
});
