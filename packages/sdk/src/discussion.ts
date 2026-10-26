import type { DiscussionPage, ItemActivity, ItemComment, ItemKind } from "@moc/types/discussion"
import type { MocTransport } from "./transport"

export type DiscussionClient = {
  listActivity(kind: ItemKind, itemId: string, workspaceId: string, cursor?: string): Promise<DiscussionPage<ItemActivity>>
  listComments(kind: ItemKind, itemId: string, workspaceId: string, cursor?: string): Promise<DiscussionPage<ItemComment>>
  createComment(kind: ItemKind, itemId: string, body: string, workspaceId: string, idempotencyKey: string): Promise<ItemComment>
}

export function createDiscussionClient(transport: MocTransport): DiscussionClient {
  return {
    listActivity: (kind, itemId, workspaceId, cursor) => transport.call("discussion", "listActivity", { kind, itemId, cursor }, workspaceId),
    listComments: (kind, itemId, workspaceId, cursor) => transport.call("discussion", "listComments", { kind, itemId, cursor }, workspaceId),
    createComment: (kind, itemId, body, workspaceId, idempotencyKey) => transport.call("discussion", "createComment", { kind, itemId, body: body.trim(), idempotencyKey }, workspaceId),
  }
}
