export type VenueRecurrenceFrequency = "day" | "week" | "month";

export type VenueRecurrenceEnd =
  | { type: "year_end" }
  | { type: "date"; date: string }
  | { type: "count"; count: number };

export type VenueRecurrence = {
  custom: boolean;
  frequency: VenueRecurrenceFrequency;
  interval: number;
  /** ISO weekday numbers: Monday = 1, Sunday = 7. Used by weekly rules. */
  weekdays: number[];
  end: VenueRecurrenceEnd | null;
};

export type VenueBookingOccurrence = {
  index: number;
  startsAt: string;
  endsAt: string;
};

const frequencyLabels: Record<VenueRecurrenceFrequency, { singular: string; plural: string }> = {
  day: { singular: "day", plural: "days" },
  week: { singular: "week", plural: "weeks" },
  month: { singular: "month", plural: "months" },
};

export function formatVenueRecurrenceLabel(recurrence: VenueRecurrence | null): string {
  if (!recurrence) return "Does not repeat";
  if (recurrence.frequency === "week" && recurrence.interval === 1 && recurrence.weekdays.join(",") === "1,2,3,4,5") return "Every weekday";

  const unit = frequencyLabels[recurrence.frequency];
  if (recurrence.interval === 1) return `Every ${unit.singular}`;
  return `Every ${recurrence.interval} ${unit.plural}`;
}

export function formatVenueRecurrenceEndLabel(recurrence: VenueRecurrence | null): string | null {
  if (!recurrence?.end) return null;
  if (recurrence.end.type === "year_end") return "Until the end of the year";
  if (recurrence.end.type === "count") return `${recurrence.end.count} occurrences`;
  return `Until ${recurrence.end.date}`;
}

export function getVenueBookingSeriesBounds(occurrences: VenueBookingOccurrence[], fallbackStartsAt: string, fallbackEndsAt: string): { startsAt: string; endsAt: string } {
  return {
    startsAt: occurrences[0]?.startsAt ?? fallbackStartsAt,
    endsAt: occurrences[occurrences.length - 1]?.endsAt ?? fallbackEndsAt,
  };
}
