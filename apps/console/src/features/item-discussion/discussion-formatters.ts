import type { DiscussionActor } from '@moc/types/discussion'
import type { DiscussionActorView, DiscussionTimeView } from './discussion-types'

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const sourceNames: Record<DiscussionActor['kind'], string | null> = { member: null, requester: 'Public submission', integration: 'Integration', system: 'Automation', unknown: null }

export function formatDiscussionActor(actor: DiscussionActor): DiscussionActorView {
    const name = actor.name.trim() || (actor.kind === 'system' ? 'System' : actor.kind === 'integration' ? 'Integration' : 'Unknown')
    return { name, initials: name.split(/\s+/).slice(0, 2).map(initial).join(''), avatarUrl: actor.avatarUrl, source: sourceNames[actor.kind] }
}

function initial(part: string): string { return part.charAt(0).toUpperCase() }

export function formatDiscussionTime(iso: string, now = Date.now()): DiscussionTimeView {
    const date = new Date(iso)
    if (!Number.isFinite(date.getTime())) return { relative: 'Unknown time', exact: 'Unknown time', clock: '' }
    const seconds = (date.getTime() - now) / 1000
    const absolute = Math.abs(seconds)
    const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] = absolute < 60 ? [0, 'second'] : absolute < 3600 ? [seconds / 60, 'minute'] : absolute < 86400 ? [seconds / 3600, 'hour'] : absolute < 604800 ? [seconds / 86400, 'day'] : absolute < 2629800 ? [seconds / 604800, 'week'] : absolute < 31557600 ? [seconds / 2629800, 'month'] : [seconds / 31557600, 'year']
    return {
        relative: amount === 0 ? 'Just now' : relativeFormat.format(Math.trunc(amount), unit),
        exact: date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
        clock: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    }
}

export function discussionDay(iso: string, now = Date.now()): { key: string; label: string } {
    const date = new Date(iso)
    if (!Number.isFinite(date.getTime())) return { key: 'unknown', label: 'Unknown date' }
    const today = new Date(now)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const key = date.toDateString()
    const label = key === today.toDateString() ? 'Today' : key === yesterday.toDateString() ? 'Yesterday' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return { key, label }
}

export function humanizeDiscussionValue(value: string): string {
    return value.replace(/[_-]+/g, ' ').replace(/^./, uppercase)
}

function uppercase(value: string): string { return value.toUpperCase() }

export function formatChangeValue(value: unknown, field = ''): string {
    if (value === null || value === undefined || value === '') return 'Not set'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) return value.length ? value.map(formatArrayValue).join(', ') : 'None'
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>
        const label = record.name ?? record.title ?? record.label
        return typeof label === 'string' ? label : Object.entries(record).map(formatObjectEntry).join(', ') || 'Not set'
    }
    if (typeof value !== 'string') return 'Unknown'
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && /date|time|_at|_on|start|end|due|return/i.test(field)) return formatDiscussionTime(value).exact
    return /status|phase|kind|priority|origin/.test(field) ? humanizeDiscussionValue(value) : value
}

function formatArrayValue(value: unknown): string { return formatChangeValue(value) }
function formatObjectEntry([key, value]: [string, unknown]): string { return `${humanizeDiscussionValue(key)}: ${formatChangeValue(value, key)}` }
