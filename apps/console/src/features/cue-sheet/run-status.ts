import type { Checklist, CueSheetEvent } from '@moc/types/cue-sheet'

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
    const topLevelChecked = checklist.items.filter((item) => item.checked).length
    const topLevelTotal = checklist.items.length
    const sectionItems = checklist.sections.flatMap((section) => section.items)
    const sectionChecked = sectionItems.filter((item) => item.checked).length

    return {
        total: topLevelTotal + sectionItems.length,
        checked: topLevelChecked + sectionChecked,
    }
}

export function isEventRunPast(event: CueSheetEvent, now = Date.now()) {
    return event.scheduledAt !== undefined && new Date(event.scheduledAt).getTime() < now
}

export function isChecklistRunComplete(checklist: Checklist) {
    const { total, checked } = getChecklistCounts(checklist)
    return total > 0 && total === checked
}

export function isChecklistRunPastOrComplete(checklist: Checklist, now = Date.now()) {
    if (isChecklistRunComplete(checklist)) return true
    return checklist.scheduledAt !== undefined && new Date(checklist.scheduledAt).getTime() < now
}

export function isChecklistRunCompleted(checklist: Checklist, now = Date.now()) {
    if (!isChecklistRunComplete(checklist)) return false
    return checklist.scheduledAt !== undefined && new Date(checklist.scheduledAt).getTime() < now
}

export function sortOverviewEventRuns(events: CueSheetEvent[]) {
    return [...events].sort((left, right) => compareScheduledTimeAsc(left.scheduledAt, right.scheduledAt))
}

export function sortOverviewChecklistRuns(checklists: Checklist[]) {
    return [...checklists].sort((left, right) => compareScheduledTimeAsc(left.scheduledAt, right.scheduledAt))
}

export function partitionEventRuns(events: CueSheetEvent[], now = Date.now()) {
    const active = events.filter((event) => !isEventRunPast(event, now))
    const past = events.filter((event) => isEventRunPast(event, now))

    return {
        active: [...active].sort((left, right) => compareScheduledTimeAsc(left.scheduledAt, right.scheduledAt)),
        past: [...past].sort((left, right) => compareScheduledTimeDesc(left.scheduledAt, right.scheduledAt)),
    }
}

export function partitionChecklistRuns(checklists: Checklist[], now = Date.now()) {
    const active = checklists.filter((checklist) => !isChecklistRunCompleted(checklist, now))
    const completed = checklists.filter((checklist) => isChecklistRunCompleted(checklist, now))

    return {
        active: [...active].sort((left, right) => compareScheduledTimeAsc(left.scheduledAt, right.scheduledAt)),
        completed: [...completed].sort((left, right) => compareScheduledTimeDesc(left.scheduledAt, right.scheduledAt)),
    }
}
