import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  availableTelegramActions,
  buildNotificationKeyboard,
  encodeActionCallback,
  parseActionCallback,
  telegramStatusLabel,
} from "./telegram-keyboard.js"

const UUID = "99447b5b-3f84-4ad8-a310-c257637a4a97"

describe("encodeActionCallback / parseActionCallback", () => {
  it("round-trips every entity/action pair", () => {
    const cases: Array<["request" | "booking" | "venue_booking", "start" | "complete" | "check_out" | "return" | "approve" | "reject"]> = [
      ["request", "start"],
      ["request", "complete"],
      ["booking", "check_out"],
      ["booking", "return"],
      ["venue_booking", "approve"],
      ["venue_booking", "reject"],
    ]
    for (const [entityType, action] of cases) {
      const encoded = encodeActionCallback({ entityType, entityId: UUID, action })
      assert.ok(Buffer.byteLength(encoded, "utf8") <= 64, `${encoded} exceeds 64 bytes`)
      assert.deepEqual(parseActionCallback(encoded), { entityType, entityId: UUID, action })
    }
  })

  it("uses short entity codes", () => {
    assert.equal(encodeActionCallback({ entityType: "request", entityId: UUID, action: "start" }), `a:rq:start:${UUID}`)
    assert.equal(encodeActionCallback({ entityType: "booking", entityId: UUID, action: "check_out" }), `a:bk:check_out:${UUID}`)
    assert.equal(encodeActionCallback({ entityType: "venue_booking", entityId: UUID, action: "reject" }), `a:vb:reject:${UUID}`)
  })

  it("rejects malformed callback data", () => {
    assert.equal(parseActionCallback("garbage"), null)
    assert.equal(parseActionCallback(`a:zz:start:${UUID}`), null) // unknown entity code
    assert.equal(parseActionCallback("a:rq:dance:" + UUID), null) // unknown action
    assert.equal(parseActionCallback("a:rq:start:not-a-uuid"), null)
    assert.equal(parseActionCallback(`a:rq:start:${UUID}:extra`), null)
  })
})

describe("availableTelegramActions", () => {
  it("matches the status → actions table", () => {
    assert.deepEqual(availableTelegramActions("request", "not_started").map((a) => a.action), ["start", "complete"])
    assert.deepEqual(availableTelegramActions("request", "in_progress").map((a) => a.action), ["complete"])
    assert.deepEqual(availableTelegramActions("booking", "booked").map((a) => a.action), ["check_out"])
    assert.deepEqual(availableTelegramActions("booking", "checked_out").map((a) => a.action), ["return"])
    assert.deepEqual(availableTelegramActions("venue_booking", "auto").map((a) => a.action), ["approve", "reject"])
    assert.deepEqual(availableTelegramActions("venue_booking", "approved").map((a) => a.action), ["reject"])
  })

  it("returns nothing for any other status", () => {
    assert.deepEqual(availableTelegramActions("request", "completed"), [])
    assert.deepEqual(availableTelegramActions("booking", "returned"), [])
    assert.deepEqual(availableTelegramActions("venue_booking", "rejected"), [])
    assert.deepEqual(availableTelegramActions("venue_booking", "cancelled"), [])
  })

  it("uses the specified labels and styles, including 'Cancel' for reject", () => {
    const [start, complete] = availableTelegramActions("request", "not_started")
    assert.deepEqual(start, { action: "start", label: "Start", style: "primary" })
    assert.deepEqual(complete, { action: "complete", label: "Complete", style: "success" })

    const [checkOut] = availableTelegramActions("booking", "booked")
    assert.deepEqual(checkOut, { action: "check_out", label: "Check out", style: "primary" })
    const [returnAction] = availableTelegramActions("booking", "checked_out")
    assert.deepEqual(returnAction, { action: "return", label: "Return", style: "success" })

    const [approve, reject] = availableTelegramActions("venue_booking", "auto")
    assert.deepEqual(approve, { action: "approve", label: "Approve", style: "success" })
    assert.deepEqual(reject, { action: "reject", label: "Cancel", style: "danger" })
  })
})

describe("buildNotificationKeyboard", () => {
  it("returns action row + Open row for a request with an action available", () => {
    const keyboard = buildNotificationKeyboard(
      { entityType: "request", entityId: UUID, status: "not_started" },
      { botUsername: "moc_bot" },
    )
    assert.ok(keyboard)
    assert.equal(keyboard.inline_keyboard.length, 2)
    assert.deepEqual(keyboard.inline_keyboard[0].map((b) => b.text), ["Start", "Complete"])
    assert.equal(keyboard.inline_keyboard[1][0].text, "View")
    assert.equal(keyboard.inline_keyboard[1][0].url, `https://t.me/moc_bot?startapp=rq_${UUID}`)
  })

  it("adds a Scan items button for a booking that is booked or checked out", () => {
    const keyboard = buildNotificationKeyboard(
      { entityType: "booking", entityId: UUID, status: "booked" },
      { botUsername: "moc_bot" },
    )
    assert.ok(keyboard)
    const openRow = keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1]
    assert.equal(openRow.length, 2)
    assert.equal(openRow[1].text, "Scan items")
    assert.equal(openRow[1].url, `https://t.me/moc_bot?startapp=sc_${UUID}`)
  })

  it("omits Open/Scan when there is no bot username", () => {
    const keyboard = buildNotificationKeyboard(
      { entityType: "booking", entityId: UUID, status: "booked" },
      { botUsername: null },
    )
    assert.ok(keyboard)
    assert.equal(keyboard.inline_keyboard.length, 1)
    assert.equal(keyboard.inline_keyboard[0][0].text, "Check out")
  })

  it("returns null when there is nothing to show", () => {
    assert.equal(
      buildNotificationKeyboard({ entityType: "request", entityId: UUID, status: "completed" }, { botUsername: null }),
      null,
    )
  })

  it("shows only 'View checklist' for a checklist target", () => {
    const keyboard = buildNotificationKeyboard({ entityType: "checklist", entityId: UUID }, { botUsername: "moc_bot" })
    assert.ok(keyboard)
    assert.equal(keyboard.inline_keyboard.length, 1)
    assert.deepEqual(keyboard.inline_keyboard[0].map((b) => b.text), ["View checklist"])
    assert.equal(keyboard.inline_keyboard[0][0].url, `https://t.me/moc_bot?startapp=cl_${UUID}`)
  })
})

describe("telegramStatusLabel", () => {
  it("maps stored statuses to human labels per entity type", () => {
    assert.equal(telegramStatusLabel("request", "not_started"), "Not started")
    assert.equal(telegramStatusLabel("request", "in_progress"), "In progress")
    assert.equal(telegramStatusLabel("request", "completed"), "Completed")
    assert.equal(telegramStatusLabel("booking", "checked_out"), "Checked out")
    assert.equal(telegramStatusLabel("venue_booking", "auto"), "Booked")
    assert.equal(telegramStatusLabel("venue_booking", "rejected"), "Rejected")
  })

  it("falls back to underscores-as-spaces for an unknown status", () => {
    assert.equal(telegramStatusLabel("request", "some_weird_status"), "some weird status")
  })
})
