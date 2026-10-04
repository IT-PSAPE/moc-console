import { describe, expect, test } from "vitest"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations as equipmentOperations } from "../../../../../apps/api/server/platform/equipment"
import { operations as bookingOperations } from "../../../../../apps/api/server/platform/bookings"
import { operations as venueOperations } from "../../../../../apps/api/server/platform/venue-bookings"

type QueryCall = { text: string; values: readonly unknown[] }

function createContext(query: (text: string, values: readonly unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>) {
  const calls: QueryCall[] = []
  const context = {
    workspaceId: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    db: {
      query: async (text: string, values: readonly unknown[] = []) => {
        calls.push({ text, values })
        return query(text, values)
      },
    },
  } as unknown as PlatformContext
  return { context, calls }
}

describe("equipment, bookings and venue booking platform operations", () => {
  test("equipment list derives the most recent active booking and scopes SQL to its verified workspace", async () => {
    const { context, calls } = createContext(async () => ({
      rows: [{
        id: "00000000-0000-4000-8000-000000000003", name: "Camera", serial_number: "CAM-1", category: "camera", status: "booked",
        location: "Shelf A", notes: null, last_active_on: null, thumbnail_url: null, booked_by: "Craig", checked_out_at: "2026-01-01T10:00:00.000Z",
      }], rowCount: 1,
    }))

    const result = await equipmentOperations.list.run(context, null) as Array<{ bookedBy: string | null; lastActiveDate: string }>
    expect(result[0]).toMatchObject({ bookedBy: "Craig", lastActiveDate: "2026-01-01T10:00:00.000Z" })
    expect(calls[0].text).toContain("WHERE e.workspace_id = $1")
    expect(calls[0].values).toEqual([context.workspaceId])
  })

  test("archiving a booking leaves its checkout and return timestamps intact", async () => {
    const { context, calls } = createContext(async () => ({ rows: [], rowCount: 1 }))
    await bookingOperations.updateStatus.run(context, { id: "00000000-0000-4000-8000-000000000003", status: "archived" })

    expect(calls[0].text).toContain("returned_at=CASE WHEN $3::public.booking_status='returned' THEN $4::timestamptz ELSE returned_at END")
    expect(calls[0].text).toContain("WHERE workspace_id=$1 AND id=$2")
    expect(calls[0].values.slice(0, 3)).toEqual([context.workspaceId, "00000000-0000-4000-8000-000000000003", "archived"])
  })

  test("cancellation records the verified actor and retains recurrence occurrence grouping", async () => {
    const calls: QueryCall[] = []
    const bookingRow = {
      id: "00000000-0000-4000-8000-000000000003", workspace_id: "00000000-0000-4000-8000-000000000001", venue_id: "00000000-0000-4000-8000-000000000004",
      event_id: null, event_other: "Workshop", tracking_code: "VEN-ABC123", title: "Workshop", requested_by: "Craig", notes: null, status: "cancelled",
      starts_at: "2026-09-01T10:00:00.000Z", ends_at: "2026-09-08T11:00:00.000Z",
      recurrence: { custom: false, frequency: "week", interval: 1, weekdays: [2], end: { type: "count", count: 2 } },
      cancelled_at: "2026-08-01T10:00:00.000Z", cancelled_by: "00000000-0000-4000-8000-000000000002", cancel_reason: "Change of plans",
      approved_at: null, approved_by: null, rejected_at: null, rejected_by: null, created_at: "2026-08-01T09:00:00.000Z", updated_at: "2026-08-01T10:00:00.000Z",
      venue_name: "Hall", venue_description: "Main auditorium", event_name: null, canceller_name: "Craig Person", approver_name: null, rejecter_name: null,
      slots: [
        { occurrence_index: 1, slot_start: "2026-09-08T10:30:00.000Z", slot_end: "2026-09-08T11:00:00.000Z" },
        { occurrence_index: 1, slot_start: "2026-09-08T10:00:00.000Z", slot_end: "2026-09-08T10:30:00.000Z" },
        { occurrence_index: 0, slot_start: "2026-09-01T10:00:00.000Z", slot_end: "2026-09-01T10:30:00.000Z" },
      ],
    }
    const context = {
      workspaceId: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      db: { query: async (text: string, values: readonly unknown[] = []) => {
        calls.push({ text, values })
        return calls.length === 1 ? { rows: [], rowCount: 1 } : { rows: [bookingRow], rowCount: 1 }
      } },
    } as unknown as PlatformContext

    const result = await venueOperations.cancel.run(context, { id: bookingRow.id, reason: " Change of plans " }) as { occurrences: unknown[]; cancelledBy: string }
    expect(calls[0].values[0]).toBe(context.workspaceId)
    expect(calls[0].values[4]).toBe(context.userId)
    expect(calls[0].values[5]).toBe("Change of plans")
    expect(result.cancelledBy).toBe("Craig Person")
    expect(result.occurrences).toEqual([
      { index: 0, startsAt: "2026-09-01T10:00:00.000Z", endsAt: "2026-09-01T10:30:00.000Z" },
      { index: 1, startsAt: "2026-09-08T10:00:00.000Z", endsAt: "2026-09-08T11:00:00.000Z" },
    ])
  })

  test("restoring a booking turns a slot unique violation into the established conflict", async () => {
    const { context } = createContext(async () => { throw Object.assign(new Error("unique"), { code: "23505" }) })
    await expect(venueOperations.restore.run(context, { id: "00000000-0000-4000-8000-000000000003" })).rejects.toMatchObject({
      status: 409,
      code: "conflict",
      message: "Those times have since been booked by someone else.",
    })
  })
})
