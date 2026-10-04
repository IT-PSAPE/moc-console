import { describe, expect, test } from "bun:test"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations } from "../../../../../apps/api/server/platform/requests.ts"

function makeContext(query: (text: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>): PlatformContext {
  return {
    db: { query } as unknown as PlatformContext["db"],
    userId: "user-1",
    workspaceId: "verified-workspace",
  }
}

describe("request platform operations", () => {
  test("lists non-archived requests from the verified workspace in due-date order", async () => {
    let sql = ""
    let values: readonly unknown[] = []
    const context = makeContext(async (text, params) => {
      sql = text
      values = params ?? []
      return { rows: [{ id: "request-1", title: "Replace cable", priority: "high", status: "in_progress", category: "event", category_name: "Event", created_at: "created", updated_at: "updated", due_date: "due", requested_by: "Alex", who: "crew", what: "cable", when_text: "soon", where_text: "hall", why: "broken", how: "replace", notes: null, flow: null, content: null }] }
    })

    const requests = await operations.list.run(context, {})

    expect(sql).toContain("requests.status <> 'archived'")
    expect(sql).toContain("ORDER BY requests.due_date ASC")
    expect(values).toEqual(["verified-workspace"])
    expect(requests).toMatchObject([{ id: "request-1", categoryName: "Event", requestedBy: "Alex" }])
    expect(operations.list.permission).toBe("can_read")
  })

  test("normalizes PostgreSQL timestamp values to ISO strings", async () => {
    const createdAt = new Date("2026-10-04T10:15:30.000Z")
    const updatedAt = new Date("2026-10-04T10:20:30.000Z")
    const dueDate = new Date("2026-10-05T10:15:30.000Z")
    const context = makeContext(async () => ({ rows: [{
      id: "request-1", title: "Replace cable", priority: "high", status: "in_progress", category: "event",
      category_name: "Event", created_at: createdAt, updated_at: updatedAt, due_date: dueDate,
      requested_by: "Alex", who: "crew", what: "cable", when_text: "soon", where_text: "hall",
      why: "broken", how: "replace", notes: null, flow: null, content: null,
    }] }))

    const [request] = await operations.list.run(context, {}) as Array<{ createdAt: string; updatedAt: string; dueDate: string }>

    expect(request).toMatchObject({
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      dueDate: dueDate.toISOString(),
    })
  })

  test("reloads the saved request with its category instead of referencing an unjoined table in RETURNING", async () => {
    let sql = ""
    const request = {
      id: "00000000-0000-4000-8000-000000000001", title: "Replace cable", priority: "high", status: "in_progress",
      category: "event", createdAt: "2026-10-04T10:15:30.000Z", updatedAt: "2026-10-04T10:20:30.000Z",
      dueDate: "2026-10-05T10:15:30.000Z", requestedBy: "Alex", who: "crew", what: "cable", when: "soon",
      where: "hall", why: "broken", how: "replace",
    }
    const context = makeContext(async (text) => {
      sql = text
      return { rows: [{ id: request.id, title: request.title, priority: request.priority, status: request.status,
        category: request.category, category_name: "Event", created_at: request.createdAt, updated_at: request.updatedAt,
        due_date: request.dueDate, requested_by: request.requestedBy, who: request.who, what: request.what,
        when_text: request.when, where_text: request.where, why: request.why, how: request.how,
        notes: null, flow: null, content: null }] }
    })

    await operations.save.run(context, { request })

    expect(sql).toContain("WITH saved AS (INSERT INTO requests")
    expect(sql).toContain("RETURNING *) SELECT requests.id")
    expect(sql).toContain("LEFT JOIN request_categories ON request_categories.workspace_id=requests.workspace_id")
    expect(sql).not.toContain("RETURNING requests.id")
  })

  test("ignores a forged workspace field and scopes request lookup to platform context", async () => {
    let values: readonly unknown[] = []
    const context = makeContext(async (_text, params) => {
      values = params ?? []
      return { rows: [] }
    })

    const request = await operations.getById.run(context, {
      id: "00000000-0000-4000-8000-000000000001",
      workspaceId: "forged-workspace",
    })

    expect(values).toEqual(["verified-workspace", "00000000-0000-4000-8000-000000000001"])
    expect(request).toBeUndefined()
  })

  test("keeps archived history ordering and scopes the query to verified workspace", async () => {
    let sql = ""
    const context = makeContext(async (text) => {
      sql = text
      return { rows: [] }
    })

    await operations.listArchived.run(context, { workspaceId: "forged-workspace" })

    expect(sql).toContain("requests.status = 'archived'")
    expect(sql).toContain("ORDER BY requests.updated_at DESC")
  })

  test("assignment insertion reports only newly created or changed assignments", async () => {
    const sqlCalls: string[] = []
    const context = makeContext(async (text) => {
      sqlCalls.push(text)
      return { rows: text.startsWith("SELECT") ? [{ id: "assignment-1", duty: "production" }] : text.startsWith("INSERT") ? [] : [{ id: "assignment-1" }] }
    })

    const changed = await operations.addAssignee.run(context, { requestId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000002", duty: "camera" })

    expect(changed).toBe(true)
    expect(sqlCalls[0]).toContain("FOR UPDATE OF assignment")
    expect(sqlCalls[1]).toContain("UPDATE request_assignees SET duty=$2")
    expect(operations.addAssignee.permission).toBe("can_write")
  })

  test("history joins actor details and sorts newest first", async () => {
    let sql = ""
    const context = makeContext(async (text) => {
      sql = text
      return { rows: [{ id: "event-1", request_id: "00000000-0000-4000-8000-000000000001", event_type: "status_changed", details: { to_status: "completed" }, created_at: "later", actor_id: "user-1", actor_name: "Alex", actor_surname: "Smith", actor_avatar_url: null }] }
    })

    const activity = await operations.listActivity.run(context, { requestId: "00000000-0000-4000-8000-000000000001" })

    expect(sql).toContain("LEFT JOIN users ON users.id = history.actor_id")
    expect(sql).toContain("ORDER BY history.created_at DESC")
    expect(activity).toMatchObject([{ type: "status_changed", actor: { id: "user-1", name: "Alex", surname: "Smith" } }])
  })
})
