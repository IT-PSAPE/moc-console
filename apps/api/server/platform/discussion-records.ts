import type { ActivityChange, DiscussionActor, DiscussionPage, ItemActivity, ItemComment, ItemKind } from "@moc/types/discussion"
import { encodeDiscussionCursor } from "./discussion-input.js"

type HistoryRow = {
  id: string
  workspace_id: string
  item_kind: ItemKind
  item_id: string
  actor_id: string | null
  actor_kind: DiscussionActor["kind"]
  actor_name: string | null
  current_actor_name: string | null
  actor_avatar_url: string | null
  created_at: string | Date
  cursor_created_at: string
}

export type ActivityRow = HistoryRow & {
  event_type: string
  changes: ActivityChange[]
  details: Record<string, unknown>
  operation_id: string | null
}
export type CommentRow = HistoryRow & { body: string; origin: string }

export const DISCUSSION_SELECT = `history.*,
  NULLIF(trim(concat_ws(' ', actor.name, actor.surname)), '') AS current_actor_name,
  actor.avatar_url AS actor_avatar_url,
  to_char(history.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at`
export const DISCUSSION_ACTOR_JOIN = "LEFT JOIN public.users AS actor ON actor.id = history.actor_id"
export const DISCUSSION_PAGE_SIZE = 30

function discussionActor(row: HistoryRow): DiscussionActor {
  const labels: Record<DiscussionActor["kind"], string> = {
    member: "Unknown member", requester: "Requester", integration: "Integration", system: "System", unknown: "Unknown",
  }
  return {
    id: row.actor_id,
    kind: row.actor_kind,
    name: row.actor_name?.trim() || row.current_actor_name?.trim() || labels[row.actor_kind] || "Unknown",
    avatarUrl: row.actor_avatar_url,
  }
}

export function activityRecord(row: ActivityRow): ItemActivity {
  return {
    id: row.id, itemKind: row.item_kind, itemId: row.item_id, type: row.event_type,
    changes: row.changes, details: row.details, actor: discussionActor(row), operationId: row.operation_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

export function commentRecord(row: CommentRow): ItemComment {
  return {
    id: row.id, itemKind: row.item_kind, itemId: row.item_id, body: row.body, origin: row.origin,
    actor: discussionActor(row), createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

export function discussionPage<Row extends HistoryRow, Item>(rows: Row[], map: (row: Row) => Item): DiscussionPage<Item> {
  const visible = rows.slice(0, DISCUSSION_PAGE_SIZE)
  const last = visible.at(-1)
  return {
    items: visible.map(map),
    nextCursor: rows.length > DISCUSSION_PAGE_SIZE && last ? encodeDiscussionCursor({
      kind: last.item_kind, itemId: last.item_id, id: last.id, createdAt: last.cursor_created_at,
    }) : null,
  }
}
