export type RichTextDateTimeKind = 'date' | 'time'

export type RichTextDateTimeSlashCommand = {
    kind: RichTextDateTimeKind
    command: string
    label: string
}

export type RichTextDateTimeSlashMatch = {
    start: number
    query: string
}

export const RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE = 'data-rich-text-date-time'
export const RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE = 'data-value'

export const richTextDateTimeSlashCommands: readonly RichTextDateTimeSlashCommand[] = [
    { kind: 'date', command: '/date', label: 'Insert date' },
    { kind: 'time', command: '/time', label: 'Insert time' },
]

function dateTimeParts(now: Date, timeZone?: string): { year: string; month: string; day: string; hour: string; minute: string } {
    const parts = timeZone
        ? new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
        : null
    const part = (type: string): string => parts?.find(item => item.type === type)?.value ?? ''
    if (parts) return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') }
    return {
        year: String(now.getFullYear()).padStart(4, '0'),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        day: String(now.getDate()).padStart(2, '0'),
        hour: String(now.getHours()).padStart(2, '0'),
        minute: String(now.getMinutes()).padStart(2, '0'),
    }
}

export function isRichTextDateTimeValue(kind: RichTextDateTimeKind, value: string): boolean {
    if (kind === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const [year, month, day] = value.split('-').map(Number)
        if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false
        const date = new Date(value + 'T00:00:00.000Z')
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    }
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function currentRichTextDateTimeValue(kind: RichTextDateTimeKind, now = new Date(), timeZone?: string): string {
    let parts: ReturnType<typeof dateTimeParts>
    try {
        parts = dateTimeParts(now, timeZone)
    } catch {
        parts = dateTimeParts(now)
    }
    return kind === 'time' ? parts.hour + ':' + parts.minute : parts.year + '-' + parts.month + '-' + parts.day
}

export function matchRichTextDateTimeSlashCommand(textBeforeCursor: string): RichTextDateTimeSlashMatch | null {
    const match = /(?:^|\s)\/([a-z]*)$/i.exec(textBeforeCursor)
    if (!match) return null
    const query = match[1].toLowerCase()
    return { start: match.index + match[0].length - query.length - 1, query }
}

export function filterRichTextDateTimeSlashCommands(query: string): RichTextDateTimeSlashCommand[] {
    const normalized = query.toLowerCase()
    return richTextDateTimeSlashCommands.filter(item => item.command.slice(1).startsWith(normalized))
}
