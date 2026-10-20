import { QueryClient } from "@tanstack/react-query"
import type { VenueAvailabilitySlot } from "../../../../../apps/request/src/types/venue-booking"
import { afterEach, describe, expect, test, vi } from "vitest"
import { renderQueryHook } from "../../../../helpers/query-hook"

vi.stubEnv("VITE_WORKSPACE_ID", "request-query-test-workspace")

const { useRequestCategories, requestCategoriesQueryKey } = await import("../../../../../apps/request/src/features/hooks/use-request-categories")
const { useVenueAvailability, publicVenueAvailabilityQueryKey, publicVenueListsQueryKey } = await import("../../../../../apps/request/src/features/hooks/use-venue-availability")

describe("public request query cache", () => {
  let client: QueryClient | undefined

  afterEach(() => {
    client?.clear()
    client = undefined
  })

  test("keeps category availability metadata tied to the workspace query", () => {
    client = new QueryClient()
    client.setQueryData(requestCategoriesQueryKey, [{ value: "general", label: "General", description: "General requests" }])

    const result = renderQueryHook(() => useRequestCategories(), client)

    expect(requestCategoriesQueryKey).toEqual(["public", "request-query-test-workspace", "request-categories"])
    expect(result.state.categories[0]?.description).toBe("General requests")
    expect(result.state.categoryAvailability).toEqual({ unavailable: false, placeholder: "Select a category" })
  })

  test("never returns another date's slots and preserves slots reserved by the current booking", () => {
    client = new QueryClient()
    const slot: VenueAvailabilitySlot = {
      venueId: "venue-1",
      venueName: "Venue 1",
      slotStart: "2026-10-21T09:00:00.000Z",
      slotEnd: "2026-10-21T09:30:00.000Z",
      timeZone: "UTC",
      available: false,
    }
    client.setQueryData(publicVenueListsQueryKey, { venues: [], events: [] })
    client.setQueryData(publicVenueAvailabilityQueryKey("venue-1", "2026-10-21"), [slot])

    const matchingDate = renderQueryHook(() => useVenueAvailability("venue-1", "2026-10-21", [slot.slotStart]), client)
    const otherDate = renderQueryHook(() => useVenueAvailability("venue-1", "2026-10-22"), client)

    expect(matchingDate.state.slots).toHaveLength(1)
    expect(matchingDate.state.slots[0]?.available).toBe(true)
    expect(matchingDate.state.slotsLoading).toBe(false)
    expect(otherDate.state.slots).toEqual([])
    expect(otherDate.state.slotsLoading).toBe(true)
  })
})
