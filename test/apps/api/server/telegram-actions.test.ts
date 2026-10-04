import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { mapApplyTelegramActionResult } from "../../../../apps/api/server/telegram-actions.js"

describe("mapApplyTelegramActionResult", () => {
  it("maps a successful transition", () => {
    assert.deepEqual(
      mapApplyTelegramActionResult({
        workspaceId: "ws1",
        previousStatus: "not_started",
        status: "in_progress",
        actorId: "user1",
        actorName: "Craig",
      }),
      {
        ok: true,
        workspaceId: "ws1",
        previousStatus: "not_started",
        status: "in_progress",
        actorId: "user1",
        actorName: "Craig",
      },
    )
  })

  it("maps a known error with a status", () => {
    assert.deepEqual(
      mapApplyTelegramActionResult({ error: "invalid_transition", status: "completed", workspaceId: "ws1" }),
      { ok: false, error: "invalid_transition", status: "completed" },
    )
  })

  it("maps a known error without a status", () => {
    assert.deepEqual(mapApplyTelegramActionResult({ error: "not_linked" }), { ok: false, error: "not_linked", status: undefined })
  })

  it("throws on an unrecognised error code", () => {
    assert.throws(() => mapApplyTelegramActionResult({ error: "something_else" }), /unknown error/)
  })

  it("throws on an empty response", () => {
    assert.throws(() => mapApplyTelegramActionResult(null), /empty database response/)
  })

  it("throws on a malformed success response", () => {
    assert.throws(() => mapApplyTelegramActionResult({ workspaceId: "ws1" }), /malformed database response/)
  })
})
