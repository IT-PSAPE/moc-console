import type { ChangeEvent, MouseEvent } from 'react'
import type { ScheduledAttendanceGroup } from '@moc/notifications'

function nextGroupLabel(groups: ScheduledAttendanceGroup[]): string {
    let number = groups.length + 1
    while (groups.some(group => group.label.trim().toLowerCase() === `group ${number}`)) number += 1
    return `Group ${number}`
}

export function useScheduledAttendanceGroupEditor(groups: ScheduledAttendanceGroup[], onChange: (groups: ScheduledAttendanceGroup[]) => void) {
    function change(event: ChangeEvent<HTMLInputElement>): void {
        const id = event.currentTarget.dataset.groupId
        const label = event.currentTarget.value
        if (!id) return
        onChange(groups.map(group => group.id === id ? { ...group, label } : group))
    }
    function add(): void {
        if (groups.length >= 8) return
        onChange([...groups, { id: crypto.randomUUID(), label: nextGroupLabel(groups) }])
    }
    function enable(): void {
        if (groups.length) return
        onChange([{ id: crypto.randomUUID(), label: 'Group 1' }, { id: crypto.randomUUID(), label: 'Group 2' }])
    }
    function remove(event: MouseEvent<HTMLButtonElement>): void {
        const id = event.currentTarget.dataset.groupId
        if (!id || groups.length <= 2) return
        onChange(groups.filter(group => group.id !== id))
    }
    function clear(): void { onChange([]) }
    return { change, add, enable, remove, clear }
}
