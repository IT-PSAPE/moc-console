import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildTrackingShareData, canRequesterModify, toBookingEditData, toRequestEditData, toVenueEditData } from "./tracking-submission.js"

describe("buildTrackingShareData", () => {
  it("shares the tracking page without putting the bearer code in the URL", () => {
    const share = buildTrackingShareData("REQ-123456789ABC", "https://requests.example.com")

    assert.equal(share.url, "https://requests.example.com/track")
    assert.ok(share.text.includes("REQ-123456789ABC"))
    assert.ok(share.text.includes("Keep it private"))
    assert.ok(!share.url.includes("REQ-123456789ABC"))
  })
})

describe("tracking result edit data", () => {
  it("maps a request lookup into the complete request form", () => {
    assert.deepEqual(toRequestEditData({
      type: "request",
      id: "request-1",
      trackingCode: "REQ-123456789ABC",
      title: "Recap video",
      status: "not_started",
      priority: "high",
      category: "video_production",
      categoryName: "Video Production",
      requestedBy: "Tendai",
      dueDate: "2026-10-01T12:00:00.000Z",
      who: "Media team",
      what: "Edit the recap",
      whenText: "After the service",
      whereText: "Main auditorium",
      why: "Weekly recap",
      how: "Use the standard package",
      notes: null,
      flow: null,
      createdAt: "2026-09-19T08:00:00.000Z",
      updatedAt: "2026-09-19T08:00:00.000Z",
    }), {
      title: "Recap video",
      priority: "high",
      category: "video_production",
      dueDate: "2026-10-01T12:00",
      requestedBy: "Tendai",
      who: "Media team",
      what: "Edit the recap",
      whenText: "After the service",
      whereText: "Main auditorium",
      why: "Weekly recap",
      how: "Use the standard package",
      notes: "",
      flow: "",
    })
  })

  it("maps equipment and venue lookup data into their editors", () => {
    assert.deepEqual(toBookingEditData({
      type: "booking",
      id: "booking-1",
      trackingCode: "BKG-123456789ABC",
      title: "Sunday setup",
      status: "booked",
      bookedBy: "Rumbi",
      checkedOutAt: "2026-10-02T06:30:00.000Z",
      expectedReturnAt: "2026-10-02T12:30:00.000Z",
      returnedAt: null,
      notes: null,
      requestedEquipment: ["Camera"],
      otherEquipment: "Tripod",
      items: [],
      createdAt: "2026-09-19T08:00:00.000Z",
      updatedAt: "2026-09-19T08:00:00.000Z",
    }).requestedEquipment, ["Camera"])

    assert.deepEqual(toVenueEditData({
      type: "venue_booking",
      id: "venue-booking-1",
      trackingCode: "VEN-123456789ABC",
      title: "Youth night",
      status: "booked",
      requestedBy: "Tapiwa",
      venueId: "venue-1",
      venueName: "Auditorium",
      venueLocation: null,
      eventId: null,
      eventName: null,
      eventOther: "Youth night",
      timeZone: "Africa/Johannesburg",
      startsAt: "2026-10-03T16:00:00.000Z",
      endsAt: "2026-10-03T18:00:00.000Z",
      slotStarts: ["2026-10-03T16:00:00.000Z"],
      notes: null,
      createdAt: "2026-09-19T08:00:00.000Z",
      updatedAt: "2026-09-19T08:00:00.000Z",
    }), {
      requestedBy: "Tapiwa",
      venueId: "venue-1",
      eventId: "other",
      eventOther: "Youth night",
      bookingDate: "2026-10-03",
      slotStarts: ["2026-10-03T16:00:00.000Z"],
    })
  })
})

describe("canRequesterModify", () => {
  it("closes requester changes after terminal or started states", () => {
    const base = {
      id: "request-1", trackingCode: "REQ-123456789ABC", title: "Request",
      createdAt: "2026-09-19T08:00:00.000Z", updatedAt: "2026-09-19T08:00:00.000Z",
      priority: "medium" as const, category: "event", categoryName: "Event", requestedBy: "Craig",
      dueDate: "2026-10-01T12:00:00.000Z", who: "Team", what: "Record", whenText: "Sunday",
      whereText: "Hall", why: "Archive", how: "Camera", notes: null, flow: null,
    }
    assert.equal(canRequesterModify({ ...base, type: "request", status: "not_started" }), true)
    assert.equal(canRequesterModify({ ...base, type: "request", status: "completed" }), false)

    const venue = {
      id: "venue-booking-1", trackingCode: "VEN-123456789ABC", title: "Youth night",
      type: "venue_booking" as const, status: "booked" as const, requestedBy: "Craig", venueId: "venue-1",
      venueName: "Auditorium", venueLocation: null, eventId: null, eventName: null,
      eventOther: "Youth night", timeZone: "Africa/Johannesburg", endsAt: "2026-10-03T18:00:00.000Z",
      slotStarts: ["2026-10-03T16:00:00.000Z"], notes: null,
      createdAt: "2026-09-19T08:00:00.000Z", updatedAt: "2026-09-19T08:00:00.000Z",
    }
    assert.equal(canRequesterModify({ ...venue, startsAt: "2026-10-03T16:00:00.000Z" }, new Date("2026-10-03T15:59:59.000Z")), true)
    assert.equal(canRequesterModify({ ...venue, startsAt: "2026-10-03T16:00:00.000Z" }, new Date("2026-10-03T16:00:00.000Z")), false)
  })
})
