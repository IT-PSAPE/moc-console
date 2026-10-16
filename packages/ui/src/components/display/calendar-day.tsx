import { CalendarRange, type CalendarRangeProps } from "./calendar-range";

export function CalendarDay<T = unknown>(props: CalendarRangeProps<T>) {
  return <CalendarRange {...props} days={1} />;
}
