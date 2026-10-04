import { describe, expect, test } from "vitest"
import { createBookingsClient } from "../../../packages/sdk/src/bookings"
import { createEquipmentClient } from "../../../packages/sdk/src/equipment"
import { createVenueBookingsClient } from "../../../packages/sdk/src/venue-bookings"
import { createVenuesClient } from "../../../packages/sdk/src/venues"
import type { MocTransport } from "../../../packages/sdk/src/transport"

function createTransport() {
  const calls: Array<{ capability: string; operation: string; input: unknown; workspaceId?: string }> = []
  const transport = {
    call: async <T>(capability: string, operation: string, input?: unknown, workspaceId?: string) => {
      calls.push({ capability, operation, input, workspaceId })
      return null as T
    },
  } as unknown as MocTransport
  return { calls, transport }
}

describe("equipment and venue SDK clients", () => {
  test("uses explicit workspace operations for equipment and batch bookings", async () => {
    const { calls, transport } = createTransport()
    await createEquipmentClient(transport).list("workspace")
    await createBookingsClient(transport).updateStatus("booking", "archived", "workspace")

    expect(calls).toEqual([
      { capability: "equipment", operation: "list", input: undefined, workspaceId: "workspace" },
      { capability: "bookings", operation: "updateStatus", input: { id: "booking", status: "archived" }, workspaceId: "workspace" },
    ])
  })

  test("routes venue event and venue booking decisions through allowlisted operations", async () => {
    const { calls, transport } = createTransport()
    await createVenuesClient(transport).listEvents("workspace")
    await createVenueBookingsClient(transport).restore("venue-booking", "workspace")

    expect(calls).toEqual([
      { capability: "venues", operation: "listEvents", input: undefined, workspaceId: "workspace" },
      { capability: "venueBookings", operation: "restore", input: { id: "venue-booking" }, workspaceId: "workspace" },
    ])
  })
})
