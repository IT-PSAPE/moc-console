import type { ItemKind } from '@moc/types/discussion'
import { queryClient } from '@/lib/query-client'

type ItemReference = { kind: ItemKind; id: string }
const resourceKinds: Record<string, ItemKind> = { requests: 'request', equipment: 'equipment', bookings: 'booking', 'venue-bookings': 'venue-booking', checklists: 'checklist', streams: 'stream', 'zoom-meetings': 'meeting', broadcasts: 'broadcast', 'scheduled-messages': 'scheduled-message' }
const itemKinds = new Set<ItemKind>(Object.values(resourceKinds))

function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function indexedRecords(value: unknown): Map<string, Record<string, unknown>> {
    const records = new Map<string, Record<string, unknown>>()
    const candidates = Array.isArray(value) ? value : asRecord(value)?.occurrences
    if (!Array.isArray(candidates)) return records
    for (const item of candidates) {
        const record = asRecord(item)
        if (record && typeof record.id === 'string') records.set(record.id, record)
    }
    return records
}

function addLinkedRequest(items: Map<string, ItemReference>, record: Record<string, unknown> | undefined | null): void {
    const requestId = record?.requestId ?? record?.request_id
    if (typeof requestId === 'string') items.set(`request:${requestId}`, { kind: 'request', id: requestId })
}

function refreshEquipmentActivity(items: Map<string, ItemReference>, previous: Record<string, unknown> | undefined | null, next: Record<string, unknown> | undefined | null): void {
    const before = equipmentIds(previous?.items)
    const after = equipmentIds(next?.items)
    for (const id of new Set([...before, ...after])) {
        items.set(`equipment:${id}`, { kind: 'equipment', id })
    }
}

function equipmentIds(value: unknown): Set<string> {
    const result = new Set<string>()
    if (!Array.isArray(value)) return result
    for (const item of value) {
        const record = asRecord(item)
        const id = record?.equipmentId ?? record?.equipment_id
        if (typeof id === 'string') result.add(id)
    }
    return result
}

function changedScheduleOccurrences(items: Map<string, ItemReference>, previous: unknown, next: unknown): void {
    const before = indexedRecords(asRecord(previous)?.schedules)
    const after = indexedRecords(asRecord(next)?.schedules)
    const changedSchedules = new Set<string>()
    for (const id of new Set([...before.keys(), ...after.keys()])) if (before.get(id) !== after.get(id)) changedSchedules.add(id)
    for (const [id, occurrence] of indexedRecords(next)) {
        if (typeof occurrence.schedule_id === 'string' && changedSchedules.has(occurrence.schedule_id)) items.set(`scheduled-message:${id}`, { kind: 'scheduled-message', id })
    }
}

export function changedDiscussionItems(resource: string, previous: unknown, next: unknown, detailId?: string): ItemReference[] {
    if (previous === next) return []
    const [family, instanceId] = resource.split(':')
    const kind = resourceKinds[family]
    const items = new Map<string, ItemReference>()
    if (kind && detailId) {
        items.set(`${kind}:${detailId}`, { kind, id: detailId })
        addLinkedRequest(items, asRecord(previous))
        addLinkedRequest(items, asRecord(next))
        if (kind === 'booking') refreshEquipmentActivity(items, asRecord(previous), asRecord(next))
    } else if (kind) {
        const before = indexedRecords(previous)
        const after = indexedRecords(next)
        for (const id of new Set([...before.keys(), ...after.keys()])) {
            if (before.get(id) === after.get(id)) continue
            items.set(`${kind}:${id}`, { kind, id })
            addLinkedRequest(items, before.get(id))
            addLinkedRequest(items, after.get(id))
            if (kind === 'booking') refreshEquipmentActivity(items, before.get(id), after.get(id))
        }
        if (kind === 'scheduled-message') changedScheduleOccurrences(items, previous, next)
    } else if (instanceId) {
        const instanceKind = family === 'request-assignees' ? 'request' : family === 'checklist-assignees' ? 'checklist' : itemKinds.has(family as ItemKind) ? family as ItemKind : null
        if (instanceKind) items.set(`${instanceKind}:${instanceId}`, { kind: instanceKind, id: instanceId })
        if (instanceKind) {
            addLinkedRequest(items, asRecord(previous))
            addLinkedRequest(items, asRecord(next))
        }
    }
    return [...items.values()]
}

export function refreshChangedItemActivity(workspaceId: string, resource: string, previous: unknown, next: unknown, detailId?: string): void {
    for (const { kind, id } of changedDiscussionItems(resource, previous, next, detailId)) {
        void queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId, `item-activity:${kind}:${id}`] })
    }
}
