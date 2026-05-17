import type { Checklist, ChecklistItem } from '@moc/types/cue-sheet'

// ─── Helpers ────────────────────────────────────────────────────────

function getAllItems(checklist: Checklist): ChecklistItem[] {
    return [
        ...checklist.items,
        ...checklist.sections.flatMap((s) => s.items),
    ]
}

export function getChecklistCounts(checklist: Checklist) {
    const all = getAllItems(checklist)
    return { total: all.length, checked: all.filter((i) => i.checked).length }
}

export function reorder<T>(list: T[], fromIndex: number, toIndex: number): T[] {
    const result = [...list]
    const [moved] = result.splice(fromIndex, 1)
    result.splice(toIndex, 0, moved)
    return result
}

export function findItemContainer(checklist: Checklist, itemId: string): string | null {
    if (checklist.items.some((i) => i.id === itemId)) return 'top'
    for (const s of checklist.sections) {
        if (s.items.some((i) => i.id === itemId)) return s.id
    }
    return null
}

export function findItem(checklist: Checklist, itemId: string): ChecklistItem | null {
    const top = checklist.items.find((i) => i.id === itemId)
    if (top) return top
    for (const s of checklist.sections) {
        const found = s.items.find((i) => i.id === itemId)
        if (found) return found
    }
    return null
}

export function removeItemFrom(checklist: Checklist, itemId: string): Checklist {
    return {
        ...checklist,
        items: checklist.items.filter((i) => i.id !== itemId),
        sections: checklist.sections.map((s) => ({
            ...s,
            items: s.items.filter((i) => i.id !== itemId),
        })),
    }
}

export function insertItemAt(checklist: Checklist, containerId: string, item: ChecklistItem, index: number): Checklist {
    if (containerId === 'top') {
        const items = [...checklist.items]
        items.splice(index, 0, item)
        return { ...checklist, items }
    }
    return {
        ...checklist,
        sections: checklist.sections.map((s) => {
            if (s.id !== containerId) return s
            const items = [...s.items]
            items.splice(index, 0, item)
            return { ...s, items }
        }),
    }
}
