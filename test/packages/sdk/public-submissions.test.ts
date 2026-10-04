import { describe, expect, test } from "vitest"
import { createMocTransport } from "../../../packages/sdk/src/transport"
import { createPublicSubmissionsClient } from "../../../packages/sdk/src/public-submissions"

describe("public submissions SDK", () => {
  test("calls the public catalog and availability allowlist with workspace ids", async () => {
    const calls: Array<{ capability: string; operation: string; input: unknown; workspaceId?: string }> = []
    const client = createPublicSubmissionsClient({
      ...createMocTransport("/"),
      async call<T>(capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T> {
        calls.push({ capability, operation, input, workspaceId })
        return [] as T
      },
    })

    await client.listRequestCategories("workspace-1")
    await client.listVenues("workspace-1")
    await client.listVenueEvents("workspace-1")
    await client.getVenueAvailability("workspace-1", "venue-1", "2030-10-12")

    expect(calls).toEqual([
      { capability: "publicSubmissions", operation: "listRequestCategories", input: { workspaceId: "workspace-1" }, workspaceId: "workspace-1" },
      { capability: "publicSubmissions", operation: "listVenues", input: { workspaceId: "workspace-1" }, workspaceId: "workspace-1" },
      { capability: "publicSubmissions", operation: "listVenueEvents", input: { workspaceId: "workspace-1" }, workspaceId: "workspace-1" },
      { capability: "publicSubmissions", operation: "getVenueAvailability", input: { workspaceId: "workspace-1", venueId: "venue-1", date: "2030-10-12" }, workspaceId: "workspace-1" },
    ])
  })

  test("submits each public form through its named API operation", async () => {
    const calls: Array<{ operation: string; input: unknown; workspaceId?: string }> = []
    const client = createPublicSubmissionsClient({
      ...createMocTransport("/"),
      async call<T>(_capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T> {
        calls.push({ operation, input, workspaceId })
        return { id: "submission-1", trackingCode: "REQ-ABC123" } as T
      },
    })
    const request = { title: "Request", priority: "medium", category: "general", dueDate: null, requestedBy: "A", who: "B", what: "C", whenText: "D", whereText: "E", why: "F", how: "G", notes: null, flow: null }
    const booking = { title: "Booking", equipmentIds: ["item-1"], bookedBy: "A", checkedOutAt: "2030-10-12T10:00:00.000Z", expectedReturnAt: "2030-10-12T12:00:00.000Z", notes: null, requestedEquipment: [], otherEquipment: null }
    const venue = { venueId: "venue-1", requestedBy: "A", slotStarts: ["2030-10-12T10:00:00.000Z"], eventId: null, eventOther: "Youth night", recurrence: { custom: true, frequency: "week", interval: 1, weekdays: [6], end: { type: "count", count: 3 } } }

    await client.submitRequest("workspace-1", request)
    await client.submitBooking("workspace-1", booking)
    await client.submitVenueBooking("workspace-1", venue)

    expect(calls).toEqual([
      { operation: "submitRequest", input: { workspaceId: "workspace-1", data: request }, workspaceId: "workspace-1" },
      { operation: "submitBooking", input: { workspaceId: "workspace-1", data: booking }, workspaceId: "workspace-1" },
      { operation: "submitVenueBooking", input: { workspaceId: "workspace-1", data: venue }, workspaceId: "workspace-1" },
    ])
  })

  test("keeps tracking on the existing HTTP contract and returns submission data", async () => {
    const seen: Array<{ url: string; method: string; body: unknown }> = []
    const transport = createMocTransport("https://api.example.test", { fetchImpl: async (url, init) => {
      seen.push({ url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null })
      return Response.json({ submission: { trackingCode: "REQ-ABC123", type: "request" } })
    } })
    const client = createPublicSubmissionsClient(transport)

    await client.lookupTracking("REQ-ABC123")

    expect(seen).toEqual([{ url: "https://api.example.test/api/public/submissions", method: "POST", body: { trackingCode: "REQ-ABC123" } }])
  })

  test("keeps not-found lookups nullable and stale tracking edits as conflicts", async () => {
    let status = 404
    const transport = createMocTransport("/", { fetchImpl: async () => Response.json(
      status === 404 ? { error: "Submission not found" } : { error: "This submission changed elsewhere. Refresh it and try again." },
      { status },
    ) })
    const client = createPublicSubmissionsClient(transport)

    await expect(client.lookupTracking("REQ-ABC123")).resolves.toBeNull()
    status = 409
    await expect(client.updateTracking({ trackingCode: "REQ-ABC123", updatedAt: "2030-01-01T00:00:00.000Z" }))
      .rejects.toMatchObject({ name: "PublicSubmissionApiError", status: 409, message: "This submission changed elsewhere. Refresh it and try again." })
  })
})
