import { CalendarRange, type CalendarRangeProps } from "./calendar-range";

export function CalendarWeek<T = unknown>(props: CalendarRangeProps<T>) {
  return <CalendarRange {...props} days={7} />;
}
