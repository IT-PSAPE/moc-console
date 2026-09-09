import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { DestinationInputError, parseNotificationDestinations } from "./destination-input.js"

describe("parseNotificationDestinations", () => {
  it("returns no override when destinations are omitted or empty", () => {
    assert.equal(parseNotificationDestinations(undefined), undefined)
    assert.equal(parseNotificationDestinations([]), undefined)
  })

  it("validates and deduplicates browser-supplied destinations", () => {
    assert.deepEqual(
      parseNotificationDestinations([
        { groupChatId: "-100123", threadId: null },
        { groupChatId: "-100123", threadId: null },
        { groupChatId: "-100456", threadId: 42 },
      ]),
      [
        { groupChatId: "-100123", threadId: null },
        { groupChatId: "-100456", threadId: 42 },
      ],
    )
  })

  it("rejects malformed destinations instead of silently falling back to routes", () => {
    assert.throws(
      () => parseNotificationDestinations({ groupChatId: "-100123", threadId: null }),
      DestinationInputError,
    )
    assert.throws(
      () => parseNotificationDestinations([{ groupChatId: "", threadId: null }]),
      DestinationInputError,
    )
    assert.throws(
      () => parseNotificationDestinations([{ groupChatId: "-100123", threadId: 0 }]),
      DestinationInputError,
    )
  })
})
