import type { ScheduledMessageType } from './scheduled-message.js'

export type ScheduledAttendanceGroup = { id: string; label: string }

/** Group identity is stable across label edits; membership belongs to responses. */
export function validateScheduledAttendanceGroups(type: ScheduledMessageType, value: unknown): ScheduledAttendanceGroup[] {
    if (!Array.isArray(value) || (value.length !== 0 && (value.length < 2 || value.length > 8))) throw new Error('Use 2 to 8 attendance groups, or none')
    if (type !== 'pre_attendance' && value.length) throw new Error('Attendance groups are only available for pre-attendance')
    const ids = new Set<string>()
    const labels = new Set<string>()
    return value.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid attendance group')
        const group = entry as Record<string, unknown>
        if (Object.keys(group).some(key => !['id', 'label'].includes(key)) || typeof group.id !== 'string' || typeof group.label !== 'string') throw new Error('Invalid attendance group')
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(group.id)) throw new Error('Invalid attendance group ID')
        const label = group.label.trim()
        if (!label || label.length > 40 || /[\r\n\t]/.test(label)) throw new Error('Group names must be 1 to 40 characters on one line')
        if (ids.has(group.id) || labels.has(label.toLowerCase())) throw new Error('Attendance groups need unique names and IDs')
        ids.add(group.id)
        labels.add(label.toLowerCase())
        return { id: group.id, label }
    })
}
