import type { ActivityChange, ItemActivity, ItemComment, ItemKind } from '@moc/types/discussion'
import { discussionDay, formatChangeValue, formatDiscussionActor, formatDiscussionTime, humanizeDiscussionValue } from './discussion-formatters'
import type { ActivityChangeView, ActivityGroupView, ActivityView, CommentView } from './discussion-types'

const itemNames: Record<ItemKind, string> = { request: 'request', equipment: 'equipment item', booking: 'equipment booking', 'venue-booking': 'venue booking', checklist: 'checklist', stream: 'stream', meeting: 'meeting', broadcast: 'broadcast', 'scheduled-message': 'scheduled message' }
const fieldNames: Record<string, string> = { due_at: 'Due date', scheduled_at: 'Scheduled for', assignees: 'Assignees', request_id: 'Linked request', requestId: 'Linked request', is_checked: 'Completed', expected_return_at: 'Expected return', checked_out_at: 'Checked out', returned_at: 'Returned', body: 'Message', post_role: 'Message phase', follow_up_minutes: 'Follow-up delay (minutes)', send_on: 'Send time', occurrence_on: 'Occurrence date', attendance_groups: 'Attendance groups', attendee_ids: 'Attendees', items: 'Items', user_id: 'Member', title: 'Title', name: 'Name' }
const actions: Record<string, string> = {
    updated: 'updated details', title_updated: 'changed the title', status_changed: 'changed the status',
    content_updated: 'updated details', due_date_changed: 'changed the due date', archived: 'archived this item', restored: 'restored this item',
    assignee_added: 'added an assignee', assignee_removed: 'removed an assignee', linked: 'linked work', unlinked: 'unlinked work',
    request_linked: 'linked a request', request_unlinked: 'unlinked a request', item_added: 'added an item', item_removed: 'removed an item',
    checked_out: 'checked out equipment', returned: 'returned equipment', approved: 'approved this booking', rejected: 'rejected this booking',
    cancelled: 'cancelled this item', completed: 'marked this item complete', reopened: 'reopened this item', published: 'published this item',
    delivery_succeeded: 'delivered this message', delivery_failed: 'could not deliver this message',
    delivery_sent: 'delivered this message', schedule_updated: 'updated the schedule', deleted: 'deleted this item',
    work_linked: 'linked work', work_unlinked: 'unlinked work', equipment_added: 'added equipment', equipment_removed: 'removed equipment',
    item_completed: 'completed an item', item_reopened: 'reopened an item', item_updated: 'updated an item',
    section_added: 'added a section', section_removed: 'removed a section', section_updated: 'updated a section',
    media_added: 'added media', media_removed: 'removed media', media_updated: 'updated media', assignee_updated: 'updated an assignee',
}

function actionText(activity: ItemActivity): string {
    if (activity.type === 'created') return activity.actor.kind === 'requester' ? `submitted this ${itemNames[activity.itemKind]}` : `created this ${itemNames[activity.itemKind]}`
    if (activity.type === 'updated' && activity.changes.length === 1) return `changed ${fieldNames[activity.changes[0].field]?.toLowerCase() ?? humanizeDiscussionValue(activity.changes[0].field).toLowerCase()}`
    if (activity.type === 'updated' && activity.changes.length > 1) return `updated ${activity.changes.length} properties`
    return actions[activity.type] ?? humanizeDiscussionValue(activity.type).toLowerCase()
}

function formatChange(change: ActivityChange, activity: ItemActivity): ActivityChangeView {
    return { field: fieldNames[change.field] ?? humanizeDiscussionValue(change.field.replace(/([a-z])([A-Z])/g, '$1 $2')), before: formatRelationValue(change, activity, 'before'), after: formatRelationValue(change, activity, 'after') }
}

function formatRelationValue(change: ActivityChange, activity: ItemActivity, side: 'before' | 'after'): string {
    const value = change[side]
    if (!/^(user_id|equipment_id)$/.test(change.field) || !value) return formatChangeValue(value, change.field)
    const snapshotLabel = activity.details[`${side}_label`]
    if (typeof snapshotLabel === 'string' && snapshotLabel.trim()) return snapshotLabel
    const otherValue = side === 'before' ? change.after : change.before
    const label = !otherValue ? activity.details.label : null
    return typeof label === 'string' && label.trim() ? label : formatChangeValue(value, change.field)
}

function formatActivity(activity: ItemActivity, now: number): ActivityView {
    const changes = activity.changes.map(formatActivityChange)
    const description = typeof activity.details.description === 'string' ? activity.details.description : typeof activity.details.reason === 'string' ? activity.details.reason : typeof activity.details.label === 'string' ? activity.details.label : typeof activity.details.requester_name === 'string' && activity.actor.kind === 'unknown' ? `Submitted by ${activity.details.requester_name}` : null
    const expandable = changes.length > 1 || changes.some(isLongChange) || (description?.length ?? 0) > 220
    return { id: activity.id, actor: formatDiscussionActor(activity.actor), time: formatDiscussionTime(activity.createdAt, now), action: actionText(activity), description, changes, expandable, changesLabel: changes.length ? `View ${changes.length === 1 ? 'change' : `${changes.length} changes`}` : 'View details' }
    function formatActivityChange(change: ActivityChange): ActivityChangeView { return formatChange(change, activity) }
}

function isLongChange(change: ActivityChangeView): boolean { return change.before.length + change.after.length > 160 }

function compareNewest<T extends { createdAt: string; id: string }>(left: T, right: T): number {
    return right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)
}

export function uniqueDiscussionItems<T extends { id: string; createdAt: string }>(items: T[]): T[] {
    const unique = new Map<string, T>()
    for (const item of items) if (!unique.has(item.id)) unique.set(item.id, item)
    return [...unique.values()].sort(compareNewest)
}

export function groupItemActivity(items: ItemActivity[], now = Date.now()): ActivityGroupView[] {
    const groups = new Map<string, ActivityGroupView>()
    const operations = new Map<string, ItemActivity[]>()
    for (const item of uniqueDiscussionItems(items)) {
        const key = item.operationId ? `${item.operationId}:${item.actor.id ?? `${item.actor.kind}:${item.actor.name}`}` : item.id
        const operation = operations.get(key) ?? []
        operation.push(item)
        operations.set(key, operation)
    }
    for (const operation of operations.values()) {
        const day = discussionDay(operation[0].createdAt, now)
        const group = groups.get(day.key) ?? { ...day, items: [] }
        group.items.push(formatOperation(operation, now))
        groups.set(day.key, group)
    }
    return [...groups.values()]
}

function formatOperation(items: ItemActivity[], now: number): ActivityView {
    const views = items.map(formatOperationItem)
    if (views.length === 1) return views[0]
    const created = views.find(isCreation)
    return { ...views[0], action: created?.action ?? `made ${views.length} updates`, expandable: true, changesLabel: `View ${views.length} updates`, changes: views.flatMap(contextualChanges), description: views.map(actionSummary).join('\n') }
    function formatOperationItem(item: ItemActivity): ActivityView { return formatActivity(item, now) }
}

function isCreation(view: ActivityView): boolean { return view.action.startsWith('created this') || view.action.startsWith('submitted this') }
function actionSummary(view: ActivityView): string { return `${humanizeDiscussionValue(view.action)}${view.description ? ` · ${view.description}` : ''}` }
function contextualChanges(view: ActivityView): ActivityChangeView[] {
    return view.changes.map(contextualChange)
    function contextualChange(change: ActivityChangeView): ActivityChangeView { return { ...change, field: view.description ? `${view.description} · ${change.field}` : change.field } }
}

export function formatItemComments(items: ItemComment[], now = Date.now()): CommentView[] {
    return uniqueDiscussionItems(items).reverse().map(formatComment)
    function formatComment(comment: ItemComment): CommentView {
        return { id: comment.id, actor: formatDiscussionActor(comment.actor), body: comment.body, origin: comment.origin === 'legacy-note' || comment.origin === 'legacy-content' ? 'Imported from notes' : null, time: formatDiscussionTime(comment.createdAt, now) }
    }
}
