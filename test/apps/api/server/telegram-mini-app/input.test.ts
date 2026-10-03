import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { parseMiniAppRequest } from "../../../../../apps/api/server/telegram-mini-app/input.js"

const initData = "user=%7B%22id%22%3A1%7D&auth_date=1&hash=" + "a".repeat(64)
const uuid = "0d3f6a30-6b8b-4e34-9a8b-9a2f6a7b0c11"

describe("parseMiniAppRequest", () => {
  it("rejects a non-object body", () => {
    assert.equal(typeof parseMiniAppRequest(null), "string")
    assert.equal(typeof parseMiniAppRequest("nope"), "string")
    assert.equal(typeof parseMiniAppRequest([1, 2]), "string")
  })

  it("requires a bounded, non-empty initData string", () => {
    assert.equal(typeof parseMiniAppRequest({ op: "view" }), "string")
    assert.equal(typeof parseMiniAppRequest({ op: "view", initData: "" }), "string")
    assert.equal(typeof parseMiniAppRequest({ op: "view", initData: "a".repeat(5000) }), "string")
  })

  it("parses a valid view request", () => {
    const parsed = parseMiniAppRequest({ op: "view", initData, target: { kind: "booking", id: uuid } })
    assert.deepEqual(parsed, { op: "view", initData, target: { kind: "booking", id: uuid } })
  })

  it("rejects a view request with a bad target kind or id", () => {
    assert.equal(typeof parseMiniAppRequest({ op: "view", initData, target: { kind: "nope", id: uuid } }), "string")
    assert.equal(typeof parseMiniAppRequest({ op: "view", initData, target: { kind: "booking", id: "not-a-uuid" } }), "string")
    assert.equal(typeof parseMiniAppRequest({ op: "view", initData }), "string")
  })

  it("parses a valid action request", () => {
    const parsed = parseMiniAppRequest({ op: "action", initData, entityType: "booking", entityId: uuid, action: "check_out" })
    assert.deepEqual(parsed, { op: "action", initData, entityType: "booking", entityId: uuid, action: "check_out" })
  })

  it("rejects an action request with an unknown entity type or action", () => {
    assert.equal(typeof parseMiniAppRequest({ op: "action", initData, entityType: "checklist", entityId: uuid, action: "check_out" }), "string")
    assert.equal(typeof parseMiniAppRequest({ op: "action", initData, entityType: "booking", entityId: uuid, action: "delete" }), "string")
  })

  it("parses a valid checklist.toggle request", () => {
    const parsed = parseMiniAppRequest({ op: "checklist.toggle", initData, checklistId: uuid, itemId: uuid, checked: true })
    assert.deepEqual(parsed, { op: "checklist.toggle", initData, checklistId: uuid, itemId: uuid, checked: true })
  })

  it("rejects a checklist.toggle request with a non-boolean checked flag", () => {
    assert.equal(typeof parseMiniAppRequest({ op: "checklist.toggle", initData, checklistId: uuid, itemId: uuid, checked: "yes" }), "string")
  })

  it("parses a valid booking.scan_complete request", () => {
    const parsed = parseMiniAppRequest({ op: "booking.scan_complete", initData, bookingId: uuid, mode: "return", scannedItemIds: [uuid] })
    assert.deepEqual(parsed, { op: "booking.scan_complete", initData, bookingId: uuid, mode: "return", scannedItemIds: [uuid] })
  })

  it("rejects a booking.scan_complete request with too many or invalid scanned ids", () => {
    assert.equal(typeof parseMiniAppRequest({ op: "booking.scan_complete", initData, bookingId: uuid, mode: "return", scannedItemIds: ["not-a-uuid"] }), "string")
    assert.equal(typeof parseMiniAppRequest({ op: "booking.scan_complete", initData, bookingId: uuid, mode: "return", scannedItemIds: Array.from({ length: 201 }, () => uuid) }), "string")
  })

  it("rejects an unknown op", () => {
    assert.equal(typeof parseMiniAppRequest({ op: "delete_everything", initData }), "string")
  })
})
