import { expect, test, vi } from "vitest"
import { createBookingsClient } from "../../../packages/sdk/src/bookings"
import { createVenueBookingsClient } from "../../../packages/sdk/src/venue-bookings"
import { createStreamsClient } from "../../../packages/sdk/src/streams"
import { createChecklistsClient } from "../../../packages/sdk/src/checklists"
import type { MocTransport } from "../../../packages/sdk/src/transport"

test("request association clients preserve explicit workspace and null detach", async () => {
  const call = vi.fn().mockResolvedValue(null)
  const transport = { call } as unknown as MocTransport
  await createBookingsClient(transport).setRequest("equipment-booking", "request", "workspace")
  await createVenueBookingsClient(transport).setRequest("venue-booking", null, "workspace")
  await createStreamsClient(transport).setStreamRequest("stream", "request", "workspace")
  await createStreamsClient(transport).setMeetingRequest("meeting", null, "workspace")
  await createChecklistsClient(transport).setRequest("checklist", "request", "workspace")
  expect(call.mock.calls).toEqual([
    ["bookings", "setRequest", { id: "equipment-booking", requestId: "request" }, "workspace"],
    ["venueBookings", "setRequest", { id: "venue-booking", requestId: null }, "workspace"],
    ["streams", "setStreamRequest", { id: "stream", requestId: "request" }, "workspace"],
    ["streams", "setMeetingRequest", { id: "meeting", requestId: null }, "workspace"],
    ["checklists", "setRequest", { id: "checklist", requestId: "request" }, "workspace"],
  ])
})
