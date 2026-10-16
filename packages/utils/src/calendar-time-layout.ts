import { getCalendarDayEvents, type CalendarEventLike } from './calendar-date-range';

export type CalendarTimedEntry<T extends CalendarEventLike> = {
  event: T;
  startMinute: number;
  endMinute: number;
  column: number;
  columns: number;
};

type PositionedEvent<T extends CalendarEventLike> = CalendarTimedEntry<T> & { start: number; end: number };

function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function minuteOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

export function getCalendarTimedLayout<T extends CalendarEventLike>(events: T[], date: Date): CalendarTimedEntry<T>[] {
  const startOfDay = dayStart(date);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  const positioned: PositionedEvent<T>[] = getCalendarDayEvents(events, date)
    .filter((event) => !event.allDay)
    .map((event) => {
      const eventStart = event.date.getTime();
      const rawEnd = event.endDate?.getTime();
      const eventEnd = Number.isFinite(rawEnd) && rawEnd! > eventStart ? rawEnd! : eventStart + 30 * 60000;
      const clippedStart = Math.max(startOfDay, eventStart);
      const clippedEnd = Math.min(endOfDay, Math.max(eventEnd, clippedStart + 30 * 60000));
      const startMinute = clippedStart === startOfDay ? 0 : minuteOfDay(clippedStart);
      const wallClockEnd = clippedEnd === endOfDay ? 1440 : minuteOfDay(clippedEnd);
      const endMinute = Math.min(1440, wallClockEnd <= startMinute ? startMinute + 30 : wallClockEnd);
      return {
        event,
        // Pack the visible clock slots too, so repeated fall-back hours cannot cover each other.
        start: startMinute,
        end: endMinute,
        startMinute,
        endMinute,
        column: 0,
        columns: 1,
      };
    })
    .sort((left, right) => left.start - right.start || left.end - right.end);

  let cluster: PositionedEvent<T>[] = [];
  let clusterEnd = -Infinity;
  const flushCluster = (): void => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    for (const entry of cluster) {
      let lane = laneEnds.findIndex((end) => end <= entry.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = entry.end;
      entry.column = lane;
    }
    for (const entry of cluster) entry.columns = laneEnds.length;
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const entry of positioned) {
    if (entry.start >= clusterEnd) flushCluster();
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.end);
  }
  flushCluster();
  return positioned.map(({ event, startMinute, endMinute, column, columns }) => ({ event, startMinute, endMinute, column, columns }));
}
