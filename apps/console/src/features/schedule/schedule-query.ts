import type { ScheduleItemType } from "./schedule-types";

export function parseScheduleMonth(value: string | null, fallback = new Date()): Date {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date(fallback.getFullYear(), fallback.getMonth(), 1);

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return new Date(fallback.getFullYear(), fallback.getMonth(), 1);

  const result = new Date(0);
  result.setHours(0, 0, 0, 0);
  result.setFullYear(year, month - 1, 1);
  return result;
}

export function formatScheduleMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatScheduleDate(date: Date): string {
  return `${formatScheduleMonth(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseScheduleDateQuery(value: string | null, fallback = new Date()): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || formatScheduleDate(date) !== value ? fallback : date;
}

export function updateScheduleMonthQuery(searchParams: URLSearchParams, date: Date): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set("month", formatScheduleMonth(date));
  return nextSearchParams;
}

export function getScheduleCalendarDates(searchParams: URLSearchParams, fallback = new Date()): { date: Date; month: Date } {
  const selectedDate = parseScheduleDateQuery(searchParams.get("date"), fallback);
  const month = parseScheduleMonth(searchParams.get("month"), selectedDate);
  if (formatScheduleMonth(selectedDate) === formatScheduleMonth(month)) return { date: selectedDate, month };
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return { date: new Date(month.getFullYear(), month.getMonth(), Math.min(selectedDate.getDate(), lastDay)), month };
}

export function updateScheduleDateQuery(searchParams: URLSearchParams, date: Date): URLSearchParams {
  const next = updateScheduleMonthQuery(searchParams, date);
  next.set("date", formatScheduleDate(date));
  return next;
}
export function parseScheduleItemType(value: string | null): ScheduleItemType {
  return value === "request" || value === "equipment" || value === "venue" ? value : "all";
}
