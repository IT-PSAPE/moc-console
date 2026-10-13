import { describe, expect, test, vi } from "vitest"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations as checklists } from "../../../../../apps/api/server/platform/checklists"
import { operations as bookings } from "../../../../../apps/api/server/platform/bookings"
import { operations as venues } from "../../../../../apps/api/server/platform/venue-bookings"
import { operations as streams } from "../../../../../apps/api/server/platform/streams"

const id = "00000000-0000-4000-8000-000000000001"
const requestId = "00000000-0000-4000-8000-000000000002"
const workspaceId = "00000000-0000-4000-8000-000000000003"
const linkedOperations = [checklists.setRequest, bookings.setRequest, venues.setRequest, streams.setStreamRequest, streams.setMeetingRequest]

function context(query: ReturnType<typeof vi.fn>): PlatformContext {
  return { workspaceId, userId: id, db: { query } } as unknown as PlatformContext
}

describe.each(linkedOperations)("request relationship operations", (operation) => {
  test("uses explicit IDs and requires update permission", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id: requestId }] }).mockResolvedValueOnce({ rowCount: 1 })
    await operation.run(context(query), { id, requestId })
    expect(operation.permission).toBe("can_update")
    expect(query.mock.calls[0][1]).toEqual([workspaceId, requestId])
    expect(query.mock.calls[1][1]).toEqual([workspaceId, id, requestId])
    expect(query.mock.calls[1][0]).toContain("SET request_id=$3 WHERE workspace_id=$1 AND id=$2")
  })

  test("rejects invalid request identity without executing SQL", async () => {
    const query = vi.fn()
    await expect(operation.run(context(query), { id, requestId: "Sunday service" })).rejects.toMatchObject({ status: 400 })
    expect(query).not.toHaveBeenCalled()
  })

  test("rejects missing or other-workspace request before changing the record", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    await expect(operation.run(context(query), { id, requestId })).rejects.toThrow("Request not found in this workspace")
    expect(query).toHaveBeenCalledTimes(1)
  })

  test("null detaches the link without changing lifecycle or provider data", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 })
    await operation.run(context(query), { id, requestId: null })
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][1]).toEqual([workspaceId, id, null])
    expect(query.mock.calls[0][0]).not.toMatch(/status=|starts_at=|returned_at=|topic=|title=/)
  })

  test("requires an explicit detach and scopes child identity", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0 })
    await expect(operation.run(context(query), { id })).rejects.toMatchObject({ status: 400 })
    expect(query).not.toHaveBeenCalled()
    await expect(operation.run(context(query), { id, requestId: null })).rejects.toMatchObject({ status: 404 })
  })
})

test("creation validates request UUID before touching provider-backed records", async () => {
  for (const operation of [streams.insertStream, streams.insertZoomMeeting]) {
    const query = vi.fn()
    await expect(operation.run(context(query), { record: { request_id: "bad-request" } })).rejects.toMatchObject({ status: 400 })
    expect(query).not.toHaveBeenCalled()
    expect(operation.permission).toBe("can_create")
  }
})
