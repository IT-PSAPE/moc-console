import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from '@moc/utils/zoned-date-time'

export function scheduledTimestamp(value: string, timezone: string): string {
    new Intl.DateTimeFormat('en', { timeZone: timezone })
    const iso = parseDateTimeInputToUtcIso(value, timezone)
    if (formatUtcIsoForDateTimeInput(iso, timezone) !== value) throw new Error('Choose a valid date and time in the workspace timezone')
    return iso
}
