export type CalendarEventLike = { date: Date; endDate?: Date; allDay?: boolean };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getCalendarDateRange(date: Date, days: number): Date[] {
  const firstDate = startOfDay(date);
  if (days === 7) firstDate.setDate(firstDate.getDate() - ((firstDate.getDay() + 6) % 7));
  return Array.from({ length: Math.max(0, days) }, (_, index) => addDays(firstDate, index));
}

export function getCalendarMonthDays(date: Date): Date[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -((firstOfMonth.getDay() + 6) % 7));
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridEnd = addDays(lastOfMonth, 6 - ((lastOfMonth.getDay() + 6) % 7));
  const count = (Date.UTC(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate()) - Date.UTC(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate())) / 86400000 + 1;
  return getCalendarDateRange(gridStart, count);
}

export function getCalendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getCalendarDayEvents<T extends CalendarEventLike>(events: T[], date: Date): T[] {
  const dayStart = startOfDay(date).getTime();
  const dayEnd = addDays(new Date(dayStart), 1).getTime();
  return events.filter((event) => {
    const start = event.date?.getTime();
    if (!Number.isFinite(start)) return false;
    const end = event.endDate?.getTime();
    const effectiveEnd = Number.isFinite(end) && end! > start ? end! : start;
    if (effectiveEnd === start) return start >= dayStart && start < dayEnd;
    return start < dayEnd && effectiveEnd > dayStart;
  });
}

export function groupCalendarEventsByDate<T extends CalendarEventLike>(events: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    if (!Number.isFinite(event.date?.getTime())) continue;
    const key = getCalendarDateKey(event.date);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }
  return groups;
}
