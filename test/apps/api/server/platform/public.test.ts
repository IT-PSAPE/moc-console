import { describe, expect, test } from "vitest"
import type { PoolClient } from "pg"
import { operations } from "../../../../../apps/api/server/platform/public.js"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context.js"

const workspaceId = "11111111-1111-4111-8111-111111111111"

function contextWithQuery(run: (sql: string, values: readonly unknown[]) => unknown[]) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = []
  const db = {
    async query(sql: string, values: readonly unknown[] = []) {
      calls.push({ sql, values })
      return { rows: run(sql, values), rowCount: 1 }
    },
  } as unknown as PoolClient
  return { context: { db, userId: "", workspaceId: "" } as PlatformContext, calls }
}

describe("public submission platform operations", () => {
  test("uses a public permission and calls only the allowlisted request catalog function", async () => {
    const { context, calls } = contextWithQuery(() => [{ key: "general", name: "General", description: null }])

    await expect(operations.listRequestCategories.permission).toBe("public")
    await expect(operations.listRequestCategories.run(context, { workspaceId })).resolves.toEqual([
      { value: "general", label: "General", description: null },
    ])
    expect(calls).toEqual([{
      sql: "SELECT key, name, description FROM public.public_list_request_categories($1::uuid)",
      values: [workspaceId],
    }])
  })

  test("keeps availability dates as venue-local calendar dates and binds venue ids", async () => {
    const { context, calls } = contextWithQuery(() => [{ venueId: "22222222-2222-4222-8222-222222222222", slotStart: "2030-10-12T16:00:00.000Z", slotEnd: "2030-10-12T16:30:00.000Z", available: true, timeZone: "Africa/Johannesburg" }])

    await expect(operations.getVenueAvailability.run(context, { workspaceId, venueId: "22222222-2222-4222-8222-222222222222", date: "2030-10-12" })).resolves.toMatchObject([
      { slotStart: "2030-10-12T16:00:00.000Z", timeZone: "Africa/Johannesburg" },
    ])
    expect(calls[0]?.values).toEqual([workspaceId, "2030-10-12", "22222222-2222-4222-8222-222222222222"])
  })

  test("passes normalized request due dates to PostgreSQL as UTC timestamps", async () => {
    const { context, calls } = contextWithQuery(() => [{ result: { id: "33333333-3333-4333-8333-333333333333", tracking_code: "REQ-ABC123" } }])

    await expect(operations.submitRequest.run(context, {
      workspaceId,
      data: { title: "Request", priority: "medium", category: "general", dueDate: "2030-10-12T16:00:00.000Z", requestedBy: "Craig", who: "Team", what: "Record", whenText: "Sunday", whereText: "Hall", why: "Archive", how: "Camera", notes: null, flow: null },
    })).resolves.toEqual({ id: "33333333-3333-4333-8333-333333333333", trackingCode: "REQ-ABC123" })
    expect(calls[0]?.values[4]).toBe("2030-10-12T16:00:00.000Z")
  })

  test("submits Other venue events with no event UUID and retains recurrence JSON", async () => {
    const { context, calls } = contextWithQuery(() => [{ result: { id: "33333333-3333-4333-8333-333333333333", tracking_code: "VEN-ABC123", title: "Youth night", starts_at: "2030-10-12T16:00:00.000Z", ends_at: "2030-10-12T17:00:00.000Z" } }])
    const recurrence = { custom: true, frequency: "week", interval: 2, weekdays: [6], end: { type: "count", count: 4 } }

    await expect(operations.submitVenueBooking.run(context, {
      workspaceId,
      data: { venueId: "22222222-2222-4222-8222-222222222222", requestedBy: "Craig", slotStarts: ["2030-10-12T16:00:00.000Z", "2030-10-12T16:30:00.000Z"], eventId: null, eventOther: "Youth night", recurrence },
    })).resolves.toEqual({ id: "33333333-3333-4333-8333-333333333333", trackingCode: "VEN-ABC123", title: "Youth night", startsAt: "2030-10-12T16:00:00.000Z", endsAt: "2030-10-12T17:00:00.000Z" })
    expect(calls[0]?.values).toEqual([workspaceId, "22222222-2222-4222-8222-222222222222", "Craig", ["2030-10-12T16:00:00.000Z", "2030-10-12T16:30:00.000Z"], null, "Youth night", null, JSON.stringify(recurrence)])
  })
})
