import { describe, expect, test, vi } from "vitest"
import type { DiscussionPage, ItemActivity, ItemComment } from "@moc/types/discussion"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations } from "../../../../../apps/api/server/platform/discussion"
import { encodeDiscussionCursor } from "../../../../../apps/api/server/platform/discussion-input"

const ITEM_ID = "00000000-0000-4000-8000-000000000001"
const COMMENT_ID = "00000000-0000-4000-8000-000000000002"
const USER_ID = "00000000-0000-4000-8000-000000000003"
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000004"
const target = { kind: "request", itemId: ITEM_ID }

function context(query: (text: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>): PlatformContext {
  return { db: { query } as unknown as PlatformContext["db"], userId: USER_ID, workspaceId: WORKSPACE_ID }
}

function historyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: COMMENT_ID, workspace_id: WORKSPACE_ID, item_kind: "request", item_id: ITEM_ID,
    actor_id: USER_ID, actor_kind: "member", actor_name: "Alex Smith", current_actor_name: "Changed Name",
    actor_avatar_url: "avatar", created_at: new Date("2026-10-26T10:00:00.123Z"),
    cursor_created_at: "2026-10-26T10:00:00.123456Z", event_type: "updated",
    changes: [{ field: "title", before: "Old", after: "New" }, { field: "status", before: "not_started", after: "in_progress" }],
    details: {}, operation_id: "change-1", body: "Please review", origin: "comment", ...overrides,
  }
}

describe("item discussion platform", () => {
  test("reads only after resolving an item inside the verified workspace and preserves all changes", async () => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : [historyRow()] }))
    const result = await operations.listActivity.run(context(query), target) as DiscussionPage<ItemActivity>

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("current_user_can"), [WORKSPACE_ID, "can_read"])
    expect(query.mock.calls[1][0]).toContain("public.requests WHERE id=$1 AND workspace_id=$2")
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [ITEM_ID, WORKSPACE_ID])
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining("history.workspace_id=$1 AND history.item_kind=$2 AND history.item_id=$3"), [WORKSPACE_ID, "request", ITEM_ID, null, null, 31])
    expect(result.items[0]).toMatchObject({ itemKind: "request", itemId: ITEM_ID, actor: { id: USER_ID, name: "Alex Smith", kind: "member", avatarUrl: "avatar" }, createdAt: "2026-10-26T10:00:00.123Z" })
    expect(result.items[0].changes).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
    expect(operations.listActivity.permission).toBe("authenticated")
    expect(operations.listComments.permission).toBe("authenticated")
    expect(operations.createComment.permission).toBe("can_update")
  })

  test("missing and cross-workspace items return the same response without querying their history", async () => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : [] }))
    await expect(operations.listComments.run(context(query), target)).rejects.toThrow("Item not found")
    expect(query).toHaveBeenCalledTimes(2)
    await expect(operations.createComment.run(context(query), { ...target, body: "Please review", idempotencyKey: COMMENT_ID })).rejects.toThrow("Item not found")
    expect(query.mock.calls).toHaveLength(4)
  })

  test("ordinary-item reads reject members without can_read before resolving the item", async () => {
    const query = vi.fn(async () => ({ rows: [{ allowed: false }] }))
    await expect(operations.listComments.run(context(query), target)).rejects.toMatchObject({ name: "WorkspaceAccessError" })
    expect(query).toHaveBeenCalledWith(expect.stringContaining("current_user_can"), [WORKSPACE_ID, "can_read"])
    expect(query).toHaveBeenCalledTimes(1)
  })

  test("missing or malformed workspace contexts are rejected before querying", async () => {
    const query = vi.fn(async () => ({ rows: [] }))
    await expect(operations.listComments.run({ ...context(query), workspaceId: "" }, target)).rejects.toThrow("Invalid workspaceId")
    await expect(operations.listComments.run({ ...context(query), workspaceId: "forged" }, target)).rejects.toThrow("Invalid workspaceId")
    expect(query).not.toHaveBeenCalled()
  })

  test.each([
    ["request", "requests"], ["equipment", "equipment"], ["booking", "bookings"], ["venue-booking", "venue_bookings"],
    ["checklist", "checklists"], ["stream", "streams"], ["meeting", "zoom_meetings"], ["broadcast", "broadcasts"],
  ])("resolves %s through the fixed %s table mapping", async (kind, table) => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : [] }))
    await operations.listComments.run(context(query), { kind, itemId: ITEM_ID })
    expect(query).toHaveBeenNthCalledWith(2, `SELECT id FROM public.${table} WHERE id=$1 AND workspace_id=$2`, [ITEM_ID, WORKSPACE_ID])
  })

  test("scheduled-message reads retain the management permission requirement", async () => {
    const query = vi.fn(async () => ({ rows: [{ allowed: false }] }))
    await expect(operations.listActivity.run(context(query), { kind: "scheduled-message", itemId: ITEM_ID })).rejects.toThrow("Insufficient workspace permission")
    expect(query).toHaveBeenCalledWith(expect.stringContaining("current_user_can"), [WORKSPACE_ID, "can_update"])
    expect(query).toHaveBeenCalledTimes(1)
  })

  test("scheduled-message managers without can_read still resolve the occurrence before querying comments", async () => {
    const query = vi.fn(async (sql: string, values?: readonly unknown[]) => ({ rows: sql.includes("current_user_can") ? [{ allowed: values?.[1] === "can_update" }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : [] }))
    await expect(operations.listComments.run(context(query), { kind: "scheduled-message", itemId: ITEM_ID })).resolves.toEqual({ items: [], nextCursor: null })
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("public.scheduled_message_occurrences"), [ITEM_ID, WORKSPACE_ID])
  })

  test("uses the last visible UUID and full timestamp precision as a stable next-page cursor", async () => {
    const rows = Array.from({ length: 31 }, (_, index) => historyRow({ id: `00000000-0000-4000-8000-${String(100 - index).padStart(12, "0")}` }))
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : rows }))
    const first = await operations.listActivity.run(context(query), target) as DiscussionPage<ItemActivity>
    const decoded = JSON.parse(Buffer.from(first.nextCursor!, "base64url").toString())
    expect(first.items).toHaveLength(30)
    expect(decoded).toEqual({ ...target, id: rows[29].id, createdAt: "2026-10-26T10:00:00.123456Z" })
    await operations.listActivity.run(context(query), { ...target, cursor: first.nextCursor })
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("(history.created_at, history.id) < ($4::timestamptz, $5::uuid)"), [WORKSPACE_ID, "request", ITEM_ID, decoded.createdAt, decoded.id, 31])
    expect(query.mock.calls[2][0]).toContain("ORDER BY history.created_at DESC, history.id DESC")
    expect(query.mock.calls[2][0]).toContain("SS.US")
  })

  test.each([
    { kind: "requests", itemId: ITEM_ID }, { kind: "constructor", itemId: ITEM_ID }, { ...target, itemId: "not-an-id" },
    { ...target, cursor: "invalid!" }, { ...target, cursor: encodeDiscussionCursor({ kind: "booking", itemId: ITEM_ID, createdAt: "2026-10-26T10:00:00.123Z", id: COMMENT_ID }) },
    { ...target, cursor: encodeDiscussionCursor({ kind: "request", itemId: ITEM_ID, createdAt: "2026-02-30T10:00:00.123Z", id: COMMENT_ID }) },
    { ...target, actorId: USER_ID },
  ])("rejects invalid or forged read input before database access: %j", async (input) => {
    const query = vi.fn(async () => ({ rows: [] }))
    await expect(operations.listActivity.run(context(query), input)).rejects.toThrow()
    expect(query).not.toHaveBeenCalled()
  })

  test("unknown attribution stays unknown, while requester names survive without a member", async () => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : [
      historyRow({ actor_id: null, actor_kind: "unknown", actor_name: null, current_actor_name: null, actor_avatar_url: null }),
      historyRow({ actor_id: null, actor_kind: "requester", actor_name: "Devon GSN", current_actor_name: null, actor_avatar_url: null }),
    ] }))
    const result = await operations.listActivity.run(context(query), target) as DiscussionPage<ItemActivity>
    expect(result.items.map((item) => item.actor)).toEqual([
      { id: null, name: "Unknown", kind: "unknown", avatarUrl: null },
      { id: null, name: "Devon GSN", kind: "requester", avatarUrl: null },
    ])
  })

  test("creates one comment using verified provenance and accepts retries of the same submission", async () => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : sql.startsWith("INSERT") ? [] : [historyRow()] }))
    const result = await operations.createComment.run(context(query), { ...target, body: "  Please review  ", idempotencyKey: COMMENT_ID }) as ItemComment
    expect(result.body).toBe("Please review")
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("current_user_can"), [WORKSPACE_ID, "can_update"])
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining("ON CONFLICT (id) DO NOTHING"), [COMMENT_ID, WORKSPACE_ID, "request", ITEM_ID, USER_ID, "Please review"])
    expect(query.mock.calls[2][0]).toContain("actor_id,actor_kind,actor_name,body")
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("history.id=$1 AND history.workspace_id=$2"), [COMMENT_ID, WORKSPACE_ID])
  })

  test.each([
    { item_kind: "booking" }, { item_id: COMMENT_ID }, { actor_id: COMMENT_ID }, { body: "Different" }, { origin: "legacy-note" },
  ])("rejects reuse of an idempotency key for a different operation: %j", async (overrides) => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : sql.startsWith("INSERT") ? [] : [historyRow(overrides)] }))
    await expect(operations.createComment.run(context(query), { ...target, body: "Please review", idempotencyKey: COMMENT_ID })).rejects.toMatchObject({ status: 409, code: "conflict" })
  })

  test("does not disclose a conflicting comment from another workspace", async () => {
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes("current_user_can") ? [{ allowed: true }] : sql.startsWith("SELECT id") ? [{ id: ITEM_ID }] : [] }))
    await expect(operations.createComment.run(context(query), { ...target, body: "Please review", idempotencyKey: COMMENT_ID })).rejects.toMatchObject({ status: 409, code: "conflict" })
  })

  test.each([
    { body: "  " }, { body: "a".repeat(10001) }, { idempotencyKey: "not-an-id" }, { actorId: USER_ID }, { origin: "legacy-note" },
  ])("rejects invalid comment input before database access: %j", async (overrides) => {
    const query = vi.fn(async () => ({ rows: [] }))
    await expect(operations.createComment.run(context(query), { ...target, body: "Please review", idempotencyKey: COMMENT_ID, ...overrides })).rejects.toThrow()
    expect(query).not.toHaveBeenCalled()
  })
})
