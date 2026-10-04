import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { buildBookingDetail, buildChecklistDetail, buildRequestDetail, buildVenueBookingDetail, type FormatSettings } from "../../../../../apps/api/server/telegram-mini-app/view-builders.js"
import type { BookingRecord } from "../../../../../apps/api/server/telegram-mini-app/store/booking-store.js"
import type { ChecklistRecord } from "../../../../../apps/api/server/telegram-mini-app/store/checklist-store.js"
import type { RequestRecord } from "../../../../../apps/api/server/telegram-mini-app/store/request-store.js"
import type { VenueBookingRecord } from "../../../../../apps/api/server/telegram-mini-app/store/venue-booking-store.js"

const format: FormatSettings = { timezone: "Africa/Harare", dateFormat: "day-month-time" }

function requestRecord(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: "r1",
    workspaceId: "w1",
    title: "Lower third",
    trackingCode: "REQ-ABC123",
    status: "in_progress",
    priority: "high",
    category: "graphic_design",
    requestedBy: "Craig",
    dueDate: "2026-09-30T10:00:00.000Z",
    who: "Guest speaker",
    what: "Name lower third",
    whenText: "Sunday",
    whereText: "Main hall",
    why: "Introduce guest",
    how: "Match template",
    notes: "Spelling confirmed",
    ...overrides,
  }
}

function bookingRecord(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "b1",
    workspaceId: "w1",
    title: "Camera kit",
    trackingCode: "BKG-ABC123",
    status: "booked",
    bookedBy: "Craig",
    checkedOutAt: "2026-09-30T10:00:00.000Z",
    expectedReturnAt: "2026-09-30T18:00:00.000Z",
    returnedAt: null,
    notes: null,
    items: [
      { id: "i1", equipmentId: "e1", name: "Camera A", serialNumber: "SN1", category: "camera" },
      { id: "i2", equipmentId: "e2", name: "Lens A", serialNumber: "SN2", category: "lens" },
    ],
    ...overrides,
  }
}

function venueRecord(overrides: Partial<VenueBookingRecord> = {}): VenueBookingRecord {
  return {
    id: "v1",
    workspaceId: "w1",
    title: "Youth night",
    trackingCode: "VEN-ABC123",
    status: "auto",
    venueName: "Main auditorium",
    eventName: null,
    eventOther: "Youth night",
    startsAt: "2026-09-30T10:00:00.000Z",
    endsAt: "2026-09-30T12:00:00.000Z",
    notes: null,
    recurrence: null,
    occurrences: [],
    ...overrides,
  }
}

function checklistRecord(overrides: Partial<ChecklistRecord> = {}): ChecklistRecord {
  return {
    id: "c1",
    workspaceId: "w1",
    name: "Sunday setup",
    description: "",
    scheduledAt: "2026-09-30T08:00:00.000Z",
    sections: [{ id: "s1", name: "Stage", sortOrder: 1 }],
    items: [
      { id: "it1", sectionId: "s1", label: "Set up mics", checked: false, sortOrder: 1, assigneeNames: ["Craig C"] },
      { id: "it2", sectionId: null, label: "Unlock doors", checked: true, sortOrder: 1, assigneeNames: [] },
    ],
    ...overrides,
  }
}

describe("buildRequestDetail", () => {
  it("formats the request's five-Ws plus category/priority/due fields", () => {
    const detail = buildRequestDetail(requestRecord(), "Graphic Design", format, [])
    assert.equal(detail.kind, "request")
    assert.equal(detail.status.label, "In Progress")
    assert.equal(detail.status.color, "yellow")
    assert.deepEqual(detail.fields.map((f) => f.label), ["Who", "What", "When", "Where", "Why", "How", "Category", "Priority", "Due"])
    assert.equal(detail.fields.find((f) => f.label === "Category")?.value, "Graphic Design")
    assert.equal(detail.fields.find((f) => f.label === "Priority")?.value, "High")
    assert.equal(detail.notes, "Spelling confirmed")
    assert.deepEqual(detail.equipment, [])
    assert.equal(detail.scanMode, null)
  })
})

describe("buildBookingDetail", () => {
  it("includes item count and equipment, with scan mode gated on canUpdate", () => {
    const detail = buildBookingDetail(bookingRecord(), format, [], true)
    assert.equal(detail.fields.find((f) => f.label === "Items")?.value, "2")
    assert.equal(detail.equipment.length, 2)
    assert.equal(detail.equipment[0].category, "Camera")
    assert.equal(detail.scanMode, "check_out")
  })

  it("omits a returned date when the booking has not been returned, and adds it when it has", () => {
    const notReturned = buildBookingDetail(bookingRecord(), format, [], true)
    assert.equal(notReturned.fields.some((f) => f.label === "Returned"), false)

    const returned = buildBookingDetail(bookingRecord({ status: "returned", returnedAt: "2026-09-30T19:00:00.000Z" }), format, [], true)
    assert.equal(returned.fields.some((f) => f.label === "Returned"), true)
  })

  it("computes scanMode from status, and always null when the viewer cannot update", () => {
    assert.equal(buildBookingDetail(bookingRecord({ status: "checked_out" }), format, [], true).scanMode, "return")
    assert.equal(buildBookingDetail(bookingRecord({ status: "returned" }), format, [], true).scanMode, null)
    assert.equal(buildBookingDetail(bookingRecord({ status: "booked" }), format, [], false).scanMode, null)
  })
})

describe("buildVenueBookingDetail", () => {
  it("shows the venue, event, when and repeat pattern", () => {
    const detail = buildVenueBookingDetail(venueRecord(), "booked", format, [])
    assert.equal(detail.fields.find((f) => f.label === "Venue")?.value, "Main auditorium")
    assert.equal(detail.fields.find((f) => f.label === "Event")?.value, "Youth night")
    assert.equal(detail.fields.find((f) => f.label === "Repeat")?.value, "Does not repeat")
    assert.equal(detail.fields.some((f) => f.label === "Occurrences"), false)
    assert.equal(detail.status.color, "blue")
  })

  it("prefers the named event over eventOther, and labels a weekly recurrence", () => {
    const detail = buildVenueBookingDetail(
      venueRecord({
        eventName: "Sunday Service",
        eventOther: null,
        recurrence: { custom: false, frequency: "week", interval: 1, weekdays: [1, 2, 3, 4, 5], end: null },
        occurrences: [
          { index: 0, startsAt: "2026-09-30T10:00:00.000Z", endsAt: "2026-09-30T12:00:00.000Z" },
          { index: 1, startsAt: "2026-10-01T10:00:00.000Z", endsAt: "2026-10-01T12:00:00.000Z" },
        ],
      }),
      "approved",
      format,
      [],
    )
    assert.equal(detail.fields.find((f) => f.label === "Event")?.value, "Sunday Service")
    assert.equal(detail.fields.find((f) => f.label === "Repeat")?.value, "Every weekday")
    assert.equal(detail.fields.some((f) => f.label === "Occurrences"), true)
    assert.equal(detail.status.label, "Approved")
    assert.equal(detail.status.color, "purple")
  })
})

describe("buildChecklistDetail", () => {
  it("groups section-less items under a null-id General section", () => {
    const detail = buildChecklistDetail(checklistRecord(), false)
    assert.equal(detail.sections.length, 2)
    assert.equal(detail.sections[0].name, "Stage")
    assert.equal(detail.sections[1].id, null)
    assert.equal(detail.sections[1].name, "General")
  })

  it("keeps items read-only without update permission, even for their assignee", () => {
    const item = buildChecklistDetail(checklistRecord(), false).sections[0].items[0]
    assert.equal(item.canToggle, false)
    assert.deepEqual(item.assigneeNames, ["Craig C"])
  })

  it("always lets an updater toggle any item", () => {
    const detail = buildChecklistDetail(checklistRecord(), true)
    assert.equal(detail.sections[0].items[0].canToggle, true)
  })
})
