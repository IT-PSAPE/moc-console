import type { Checklist } from '@moc/types/checklists'

function getChecklistCounts(checklist: Checklist) {
    const items = [...checklist.items, ...checklist.sections.flatMap((section) => section.items)]
    return { total: items.length, checked: items.filter((item) => item.checked).length }
}

export function isChecklistRunComplete(checklist: Checklist) {
    const { total, checked } = getChecklistCounts(checklist)
    return total > 0 && total === checked
}

export function partitionChecklistRuns(checklists: Checklist[]) {
    const active = checklists.filter((checklist) => !isChecklistRunComplete(checklist))
    const completed = checklists.filter((checklist) => isChecklistRunComplete(checklist))

    return {
        active,
        completed,
    }
}
