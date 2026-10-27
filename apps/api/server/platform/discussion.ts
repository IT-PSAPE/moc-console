import type { ItemComment } from "@moc/types/discussion"
import { WorkspaceAccessError } from "../workspace-access.js"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { commentBody, discussionCursor, discussionTarget, ITEM_TABLES, type DiscussionTarget } from "./discussion-input.js"
import {
  activityRecord, commentRecord, discussionPage, DISCUSSION_ACTOR_JOIN, DISCUSSION_PAGE_SIZE, DISCUSSION_SELECT, EQUIPMENT_ACTIVITY_SOURCE,
  type ActivityRow, type CommentRow,
} from "./discussion-records.js"
import { objectInput, uuidField } from "./input.js"

async function requireItem(context: PlatformContext, target: DiscussionTarget, permission: "can_read" | "can_update"): Promise<void> {
  const workspaceId = uuidField({ workspaceId: context.workspaceId }, "workspaceId")
  const required = target.kind === "scheduled-message" ? "can_update" : permission
  const access = await context.db.query<{ allowed: boolean }>(
    "SELECT moc_private.current_user_can($1::uuid, $2::text) AS allowed", [workspaceId, required],
  )
  if (!access.rows[0]?.allowed) throw new WorkspaceAccessError("Insufficient workspace permission")
  const result = await context.db.query<{ id: string }>(
    `SELECT id FROM public.${ITEM_TABLES[target.kind]} WHERE id=$1 AND workspace_id=$2`, [target.itemId, context.workspaceId],
  )
  if (!result.rows[0]) throw new Error("Item not found")
}

async function listHistory(context: PlatformContext, value: unknown, table: "item_activity" | "item_comments"): Promise<ActivityRow[] | CommentRow[]> {
  const input = objectInput(value, ["kind", "itemId", "cursor"])
  const target = discussionTarget(input)
  const cursor = discussionCursor(input, target)
  await requireItem(context, target, "can_read")
  const source = table === "item_activity" && target.kind === "equipment" ? EQUIPMENT_ACTIVITY_SOURCE : `public.${table}`
  const result = await context.db.query<ActivityRow | CommentRow>(
    `SELECT ${DISCUSSION_SELECT} FROM ${source} AS history ${DISCUSSION_ACTOR_JOIN}
      WHERE history.workspace_id=$1 AND history.item_kind=$2 AND history.item_id=$3
      AND ($4::timestamptz IS NULL OR (history.created_at, history.id) < ($4::timestamptz, $5::uuid))
      ORDER BY history.created_at DESC, history.id DESC LIMIT $6`,
    [context.workspaceId, target.kind, target.itemId, cursor?.createdAt ?? null, cursor?.id ?? null, DISCUSSION_PAGE_SIZE + 1],
  )
  return result.rows as ActivityRow[] | CommentRow[]
}

function commentConflict(): Error {
  return Object.assign(new Error("Comment retry conflicts with an existing operation"), { status: 409, code: "conflict" })
}

async function createComment(context: PlatformContext, value: unknown): Promise<ItemComment> {
  const input = objectInput(value, ["kind", "itemId", "body", "idempotencyKey"])
  const target = discussionTarget(input)
  const body = commentBody(input)
  const id = uuidField(input, "idempotencyKey").toLowerCase()
  await requireItem(context, target, "can_update")
  await context.db.query(
    `INSERT INTO public.item_comments (id,workspace_id,item_kind,item_id,actor_id,actor_kind,actor_name,body)
      VALUES ($1,$2,$3,$4,$5,'member',
        (SELECT NULLIF(trim(concat_ws(' ', name, surname)), '') FROM public.users WHERE id=$5),$6)
      ON CONFLICT (id) DO NOTHING`,
    [id, context.workspaceId, target.kind, target.itemId, context.userId, body],
  )
  // A separate statement sees a concurrent successful retry after ON CONFLICT waits for it.
  const result = await context.db.query<CommentRow>(
    `SELECT ${DISCUSSION_SELECT} FROM public.item_comments AS history ${DISCUSSION_ACTOR_JOIN}
      WHERE history.id=$1 AND history.workspace_id=$2`, [id, context.workspaceId],
  )
  const row = result.rows[0]
  if (!row || row.item_kind !== target.kind || row.item_id !== target.itemId || row.actor_id !== context.userId ||
      row.body !== body || row.origin !== "comment") throw commentConflict()
  return commentRecord(row)
}

export const operations: Record<string, PlatformOperation> = {
  listActivity: {
    permission: "authenticated",
    async run(context, input) { return discussionPage(await listHistory(context, input, "item_activity") as ActivityRow[], activityRecord) },
  },
  listComments: {
    permission: "authenticated",
    async run(context, input) { return discussionPage(await listHistory(context, input, "item_comments") as CommentRow[], commentRecord) },
  },
  createComment: { permission: "can_update", run: createComment },
}
