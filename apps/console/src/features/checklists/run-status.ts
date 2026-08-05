import type { Checklist } from '@moc/types/checklists'

function getScheduledTime(value?: string) {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER
}

function compareScheduledTimeAsc(left?: string, right?: string) {
    return getScheduledTime(left) - getScheduledTime(right)
}

function compareScheduledTimeDesc(left?: string, right?: string) {
    return getScheduledTime(right) - getScheduledTime(left)
}

function getChecklistCounts(checklist: Checklist) {
    const items = [...checklist.items, ...checklist.sections.flatMap((section) => section.items)]
    return { total: items.length, checked: items.filter((item) => item.checked).length }
}

export function isChecklistRunComplete(checklist: Checklist) {
    const { total, checked } = getChecklistCounts(checklist)
    return total > 0 && total === checked
}

export function isChecklistRunPastOrComplete(checklist: Checklist, now = Date.now()) {
    if (isChecklistRunComplete(checklist)) return true
    return checklist.scheduledAt !== undefined && new Date(checklist.scheduledAt).getTime() < now
}

export function partitionChecklistRuns(checklists: Checklist[]) {
    const active = checklists.filter((checklist) => !isChecklistRunComplete(checklist))
    const completed = checklists.filter((checklist) => isChecklistRunComplete(checklist))

    return {
        active: [...active].sort((left, right) => compareScheduledTimeAsc(left.scheduledAt, right.scheduledAt)),
        completed: [...completed].sort((left, right) => compareScheduledTimeDesc(left.scheduledAt, right.scheduledAt)),
    }
}
