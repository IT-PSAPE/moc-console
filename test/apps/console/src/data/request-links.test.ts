import { queryClient } from "../../../../../apps/console/src/lib/query-client"
import { beforeEach, expect, test, vi } from "vitest"
import { setRecordRequest } from "../../../../../apps/console/src/data/request-links"
import { getWorkspaceResourceState, setWorkspaceResourceData } from "../../../../../apps/console/src/data/workspace-resource-cache"

const { setRequest } = vi.hoisted(() => ({ setRequest: vi.fn().mockResolvedValue(undefined) }))
vi.mock("../../../../../apps/console/src/lib/moc-client", () => ({ moc: { checklists: { setRequest }, bookings: { setRequest } } }))

beforeEach(() => { vi.clearAllMocks() })

test("relationship updates preserve the rest of the cached collection and record fields", async () => {
  const initial = [
    { id: "first", name: "Completed run", requestId: "old", items: [{ checked: true }] },
    { id: "second", name: "Other run", requestId: "other", items: [] },
  ]
  setWorkspaceResourceData("workspace", "checklists", initial)
  setWorkspaceResourceData("workspace", "request-linked-records", [{ id: "first" }])
  await setRecordRequest("checklist", "first", null, "workspace")
  expect(setRequest).toHaveBeenCalledWith("first", null, "workspace")
  expect(getWorkspaceResourceState("workspace", "checklists").data).toEqual([
    { ...initial[0], requestId: undefined }, initial[1],
  ])
  expect(queryClient.getQueryState(["workspace", "workspace", "request-linked-records"])?.isInvalidated).toBe(true)
})

test("a failed association keeps cached records intact", async () => {
  const initial = [{ id: "booking", title: "Camera", requestId: "old", status: "returned" }]
  setWorkspaceResourceData("workspace", "bookings", initial)
  setRequest.mockRejectedValueOnce(new Error("Denied"))
  await expect(setRecordRequest("booking", "booking", "next", "workspace")).rejects.toThrow("Denied")
  expect(getWorkspaceResourceState("workspace", "bookings").data).toEqual(initial)
})

test('link changes refresh both requests and the item even when its collection was never loaded', async () => {
  const workspaceId = 'unloaded-link-workspace'
  setWorkspaceResourceData(workspaceId, 'booking:booking:request-link', { requestId: 'previous', options: [] })
  const keys = ['item-activity:booking:booking', 'item-activity:request:previous', 'item-activity:request:next']
  for (const resource of keys) queryClient.setQueryData(['workspace', workspaceId, resource], [])
  await setRecordRequest('booking', 'booking', 'next', workspaceId)
  for (const resource of keys) expect(queryClient.getQueryState(['workspace', workspaceId, resource])?.isInvalidated).toBe(true)
  expect(getWorkspaceResourceState(workspaceId, 'bookings').data).toBeUndefined()
})
