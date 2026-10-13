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

export function updateScheduleMonthQuery(searchParams: URLSearchParams, date: Date): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set("month", formatScheduleMonth(date));
  return nextSearchParams;
}
