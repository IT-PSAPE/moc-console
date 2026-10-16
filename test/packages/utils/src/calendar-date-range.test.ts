import { describe, expect, it } from 'vitest';
import { getCalendarDateRange, getCalendarDayEvents, getCalendarMonthDays, getCalendarDateKey, groupCalendarEventsByDate } from '../../../../packages/utils/src/calendar-date-range';
import { getCalendarTimedLayout } from '../../../../packages/utils/src/calendar-time-layout';

function localDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

describe('calendar date utilities', () => {
  it('starts week ranges on Monday and steps in local calendar days', () => {
    const dates = getCalendarDateRange(localDate(2026, 2, 11, 13), 7);
    expect(dates.map(getCalendarDateKey)).toEqual(['2026-2-9', '2026-2-10', '2026-2-11', '2026-2-12', '2026-2-13', '2026-2-14', '2026-2-15']);
    expect(getCalendarDateRange(localDate(2026, 9, 25), 4).map((date) => date.getDate())).toEqual([25, 26, 27, 28]);
  });

  it('returns complete Monday-first month grids with four, five, or six weeks', () => {
    expect(getCalendarMonthDays(localDate(2021, 1, 1))).toHaveLength(28);
    expect(getCalendarMonthDays(localDate(2026, 8, 1))).toHaveLength(35);
    const sixWeeks = getCalendarMonthDays(localDate(2026, 7, 1));
    expect(sixWeeks).toHaveLength(42);
    expect(sixWeeks[0].getDay()).toBe(1);
    expect(sixWeeks.at(-1)?.getDay()).toBe(0);
  });

  it('handles leap days and month grids crossing a year boundary', () => {
    const leapMonth = getCalendarMonthDays(localDate(2024, 1, 1));
    expect(leapMonth.some((date) => date.getFullYear() === 2024 && date.getMonth() === 1 && date.getDate() === 29)).toBe(true);
    expect(getCalendarMonthDays(localDate(2026, 11, 1)).at(-1)?.getFullYear()).toBe(2027);
  });

  it('keeps legacy grouping date-only while day selection includes events crossing midnight', () => {
    const overnight = { date: localDate(2026, 5, 10, 23), endDate: localDate(2026, 5, 11, 1) };
    const point = { date: localDate(2026, 5, 11, 0) };
    expect(groupCalendarEventsByDate([overnight]).size).toBe(1);
    expect(getCalendarDayEvents([overnight, point], localDate(2026, 5, 11))).toEqual([overnight, point]);
    expect(getCalendarDayEvents([overnight], localDate(2026, 5, 12))).toEqual([]);
  });
});

describe('getCalendarTimedLayout', () => {
  it('clips overnight events and assigns separate columns to concurrent events', () => {
    const day = localDate(2026, 5, 11);
    const overnight = { id: 'overnight', date: localDate(2026, 5, 10, 23), endDate: localDate(2026, 5, 11, 1) };
    const overlap = { id: 'overlap', date: localDate(2026, 5, 11, 0, 30), endDate: localDate(2026, 5, 11, 2) };
    const layout = getCalendarTimedLayout([overnight, overlap], day);
    expect(layout.map(({ startMinute, endMinute }) => [startMinute, endMinute])).toEqual([[0, 60], [30, 120]]);
    expect(layout.map(({ column, columns }) => [column, columns])).toEqual([[0, 2], [1, 2]]);
  });

  it('omits all-day events and gives points or invalid ends a 30-minute visual duration', () => {
    const day = localDate(2026, 5, 11);
    const point = { date: localDate(2026, 5, 11, 9) };
    const invalidEnd = { date: localDate(2026, 5, 11, 10), endDate: new Date(Number.NaN) };
    const allDay = { date: day, allDay: true };
    const layout = getCalendarTimedLayout([point, invalidEnd, allDay], day);
    expect(layout.map(({ startMinute, endMinute }) => [startMinute, endMinute])).toEqual([[540, 570], [600, 630]]);
  });

  it('uses wall-clock minutes around both DST transitions and clips midnight to 1440', () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      for (const [month, day] of [[2, 8], [10, 1]]) {
        const date = localDate(2026, month, day);
        const event = { date: localDate(2026, month, day, 9), endDate: localDate(2026, month, day + 1) };
        expect(getCalendarTimedLayout([event], date).map(({ startMinute, endMinute }) => [startMinute, endMinute])).toEqual([[540, 1440]]);
      }
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it('ignores invalid dates, uses exclusive midnight ends, and reuses lanes after events stop overlapping', () => {
    const day = localDate(2026, 5, 11);
    const morning = { id: 'morning', date: localDate(2026, 5, 11, 9), endDate: localDate(2026, 5, 11, 10) };
    const next = { id: 'next', date: localDate(2026, 5, 11, 10), endDate: localDate(2026, 5, 11, 11) };
    const invalid = { id: 'invalid', date: new Date(Number.NaN) };
    const endsAtMidnight = { id: 'midnight', date: localDate(2026, 5, 10, 23), endDate: day };
    expect(getCalendarDayEvents([endsAtMidnight], day)).toEqual([]);
    const layout = getCalendarTimedLayout([morning, next, invalid], day);
    expect(layout.map(({ event, column, columns }) => [event.id, column, columns])).toEqual([['morning', 0, 1], ['next', 0, 1]]);
  });
});

it('places repeated fall-back clock times beside each other instead of covering them', () => {
  const previousTz = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const entries = getCalendarTimedLayout([
      { date: new Date('2026-11-01T01:30:00-04:00'), endDate: new Date('2026-11-01T01:50:00-04:00') },
      { date: new Date('2026-11-01T01:30:00-05:00'), endDate: new Date('2026-11-01T01:50:00-05:00') },
    ], new Date(2026, 10, 1));
    expect(entries.map(entry => [entry.startMinute, entry.column, entry.columns])).toEqual([[90, 0, 2], [90, 1, 2]]);
  } finally {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  }
});
