import type { DiscussionPage, ItemActivity, ItemComment, ItemKind } from '@moc/types/discussion'
import { moc } from '@/lib/moc-client'

export function fetchItemActivity(kind: ItemKind, itemId: string, workspaceId: string, cursor?: string): Promise<DiscussionPage<ItemActivity>> {
    return moc.discussion.listActivity(kind, itemId, workspaceId, cursor)
}

export function fetchItemComments(kind: ItemKind, itemId: string, workspaceId: string, cursor?: string): Promise<DiscussionPage<ItemComment>> {
    return moc.discussion.listComments(kind, itemId, workspaceId, cursor)
}

export function createItemComment(kind: ItemKind, itemId: string, body: string, workspaceId: string, idempotencyKey: string): Promise<ItemComment> {
    return moc.discussion.createComment(kind, itemId, body, workspaceId, idempotencyKey)
}
