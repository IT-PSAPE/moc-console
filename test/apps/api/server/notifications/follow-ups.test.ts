import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  deleteEntityOriginals,
  publishEntityFollowUp,
  refreshEntityOriginals,
  type FollowUpIO,
  type OriginalRow,
} from "../../../../../apps/api/server/notifications/follow-ups.js"
import type { DeliveryInput } from "../../../../../apps/api/server/notifications/delivery-store.js"

function original(overrides: Partial<OriginalRow> = {}): OriginalRow {
  return {
    id: "delivery-1",
    workspace_id: "workspace-1",
    event_type: "request.created",
    scope: "group",
    route_id: "route-1",
    recipient_user_id: null,
    chat_id: "chat-1",
    thread_id: 5,
    text: "Original text",
    telegram_message_id: 100,
    ...overrides,
  }
}

function fakeIo(overrides: Partial<FollowUpIO> = {}): { io: FollowUpIO; calls: Record<string, unknown[]> } {
  const calls: Record<string, unknown[]> = {
    editOriginal: [],
    syncRequestKeyboard: [],
    deleteOriginal: [],
    enqueueDelivery: [],
    processDeliveriesForEvent: [],
    persistKeyboard: [],
    markDeleted: [],
  }
  const io: FollowUpIO = {
    fetchOriginals: async () => [original()],
    resolveTemplate: async () => "Hello {{title}}",
    fetchFormatSettings: async () => ({ timezone: "Africa/Harare", dateFormat: "day-month-time" }),
    buildFreshEntityTokens: async () => ({ title: "Fresh title" }),
    buildKeyboard: async () => null,
    syncRequestKeyboard: async (entityId, chatId, messageId, applied) => {
      calls.syncRequestKeyboard.push([entityId, chatId, messageId, applied])
      return applied ?? null
    },
    editOriginal: async (chatId, messageId, html, keyboard) => {
      calls.editOriginal.push([chatId, messageId, html, keyboard])
      return { ok: true, result: null }
    },
    deleteOriginal: async (chatId, messageId) => {
      calls.deleteOriginal.push([chatId, messageId])
      return { ok: true }
    },
    enqueueDelivery: async (input: DeliveryInput) => {
      calls.enqueueDelivery.push([input])
    },
    processDeliveriesForEvent: async (eventKey: string) => {
      calls.processDeliveriesForEvent.push([eventKey])
      return { attempted: 1, sent: 1, failed: 0, pendingRetry: 0 }
    },
    persistKeyboard: async (deliveryId, keyboard) => {
      calls.persistKeyboard.push([deliveryId, keyboard])
    },
    markDeleted: async (deliveryId) => {
      calls.markDeleted.push([deliveryId])
    },
    ...overrides,
  }
  return { io, calls }
}

describe("publishEntityFollowUp", () => {
  it("updates the group and every request assignment DM without sending another message", async () => {
    const { io, calls } = fakeIo({
      fetchOriginals: async () => [
        original(),
        original({ id: "assignment-1", event_type: null, scope: "dm", chat_id: "assignee-1", telegram_message_id: 101 }),
        original({ id: "assignment-2", event_type: null, scope: "dm", chat_id: "assignee-2", telegram_message_id: 102 }),
      ],
    })
    await publishEntityFollowUp({
      entityType: "request", entityId: "req-1", eventKey: "request.status_changed:req-1:completed", note: "Completed", loud: false,
    }, io)
    assert.equal(calls.editOriginal.length, 1)
    assert.deepEqual(calls.syncRequestKeyboard, [
      ["req-1", "chat-1", 100, null], ["req-1", "assignee-1", 101, undefined], ["req-1", "assignee-2", 102, undefined],
    ])
    assert.deepEqual(calls.persistKeyboard.map(call => (call as unknown[])[0]), ["delivery-1", "assignment-1", "assignment-2"])
    assert.equal(calls.enqueueDelivery.length, 0)
  })

  it("keeps refreshing other copies when Telegram rejects one DM edit", async () => {
    const { io, calls } = fakeIo({
      fetchOriginals: async () => [
        original({ id: "unavailable-dm", event_type: null, scope: "dm", chat_id: "missing-chat" }),
        original(),
        original({ id: "valid-dm", event_type: null, scope: "dm", chat_id: "valid-chat" }),
      ],
      syncRequestKeyboard: async (_id, chatId) => {
        if (chatId === "missing-chat") throw new Error("message to edit not found")
        return null
      },
    })
    await refreshEntityOriginals({ entityType: "request", entityId: "req-1" }, io)
    assert.equal(calls.editOriginal.length, 1)
    assert.deepEqual(calls.persistKeyboard.map(call => (call as unknown[])[0]), ["delivery-1", "valid-dm"])
    assert.equal(calls.enqueueDelivery.length, 0)
  })

  it("quiet: edits the original but enqueues no reply", async () => {
    const { io, calls } = fakeIo()
    await publishEntityFollowUp(
      { entityType: "request", entityId: "req-1", eventKey: "request.status_changed:req-1:1", note: "▶️ Started by Craig", loud: false },
      io,
    )
    assert.equal(calls.editOriginal.length, 1)
    assert.equal(calls.enqueueDelivery.length, 0)
    const [, , html] = calls.editOriginal[0] as [string, number, string]
    assert.ok(html.includes("▶️ Started by Craig"), "the footer note is applied to the edited body")
  })

  it("refreshes a routed DM with the announcement template", async () => {
    const { io, calls } = fakeIo({
      fetchOriginals: async () => [original({ scope: "dm", chat_id: "routed-chat", thread_id: null })],
      resolveTemplate: async (_workspaceId, scope) => scope === "group" ? "Custom announcement: {{title}}" : "Assignment template",
    })
    await refreshEntityOriginals({ entityType: "request", entityId: "req-1" }, io)
    assert.match((calls.editOriginal[0] as [string, number, string])[2], /Custom announcement: Fresh title/)
  })

  it("loud: edits the original AND enqueues exactly one reply per original, addressed to it", async () => {
    const { io, calls } = fakeIo({
      fetchOriginals: async () => [original({ payload: { telegramActor: { source: "member", name: "Creator" } } })],
    })
    await publishEntityFollowUp(
      { entityType: "request", entityId: "req-1", eventKey: "request.requester_updated:req-1:abc", note: "✏️ Updated by requester", loud: true, attribution: { action: "updated", source: "requester", name: "A & B" } },
      io,
    )
    assert.equal(calls.editOriginal.length, 1)
    assert.equal(calls.enqueueDelivery.length, 1)
    const [input] = calls.enqueueDelivery[0] as [DeliveryInput]
    assert.equal(input.parentDeliveryId, "delivery-1")
    assert.equal(input.chatId, "chat-1")
    assert.equal(input.threadId, 5)
    assert.equal(input.scope, "group")
    assert.equal(input.text, "✏️ Updated by requester\n<footer>Updated by A &amp; B</footer>")
    assert.match((calls.editOriginal[0] as [string, number, string])[2], /Created by Creator[\s\S]*Updated by A &amp; B/)
    assert.equal(calls.processDeliveriesForEvent.length, 1)
  })

  it("does nothing (no edit, no reply) when there is no sent original", async () => {
    const { io, calls } = fakeIo({ fetchOriginals: async () => [] })
    await publishEntityFollowUp(
      { entityType: "request", entityId: "req-missing", eventKey: "request.status_changed:req-missing:1", note: "note", loud: true },
      io,
    )
    assert.equal(calls.editOriginal.length, 0)
    assert.equal(calls.enqueueDelivery.length, 0)
  })

  it("is idempotent by construction: the same eventKey against the same original always yields the same destination fields", async () => {
    const { io, calls } = fakeIo()
    const input = { entityType: "request" as const, entityId: "req-1", eventKey: "request.requester_updated:req-1:edit-3", note: "✏️ Updated by requester", loud: true }
    await publishEntityFollowUp(input, io)
    await publishEntityFollowUp(input, io)
    assert.equal(calls.enqueueDelivery.length, 2)
    const [first] = calls.enqueueDelivery[0] as [DeliveryInput]
    const [second] = calls.enqueueDelivery[1] as [DeliveryInput]
    // enqueueDelivery itself upserts on (event_key, destination_key) with
    // ignoreDuplicates — this asserts the two calls would collide on exactly
    // that pair, which is what makes a retried follow-up idempotent.
    assert.equal(first.eventKey, second.eventKey)
    assert.equal(first.scope, second.scope)
    assert.equal(first.chatId, second.chatId)
    assert.equal(first.threadId, second.threadId)
  })

  it("never throws — a failure from IO is logged and swallowed", async () => {
    const { io } = fakeIo({
      fetchOriginals: async () => {
        throw new Error("boom")
      },
    })
    await assert.doesNotReject(() =>
      publishEntityFollowUp({ entityType: "request", entityId: "req-1", eventKey: "k", note: "n", loud: false }, io),
    )
  })
})

describe("deleteEntityOriginals", () => {
  it("marks the original deleted without a fallback edit when delete succeeds", async () => {
    const { io, calls } = fakeIo()
    await deleteEntityOriginals({ entityType: "booking", entityId: "bk-1", eventKey: "booking.requester_deleted:bk-1:1" }, io)
    assert.equal(calls.deleteOriginal.length, 1)
    assert.equal(calls.editOriginal.length, 0)
    assert.equal(calls.markDeleted.length, 1)
    const [markedId] = calls.markDeleted[0] as [string]
    assert.equal(markedId, "delivery-1")
  })

  it("falls back to a struck-through edit, and still marks deleted, when delete fails", async () => {
    const { io, calls } = fakeIo({
      deleteOriginal: async (chatId, messageId) => {
        calls.deleteOriginal.push([chatId, messageId])
        return { ok: false, description: "message can't be deleted" }
      },
    })
    await deleteEntityOriginals({ entityType: "booking", entityId: "bk-1", eventKey: "booking.requester_deleted:bk-1:1" }, io)
    assert.equal(calls.deleteOriginal.length, 1)
    assert.equal(calls.editOriginal.length, 1)
    assert.equal(calls.markDeleted.length, 1)
  })
})

describe("refreshEntityOriginals", () => {
  it("re-renders and re-keys while retaining the prior authorship and change note", async () => {
    const payload = {
      telegramActor: { source: "member", name: "Creator" },
      telegramChange: { note: "Updated by Editor", at: "2026-05-21T17:00:00Z" },
    }
    const { io, calls } = fakeIo({ fetchOriginals: async () => [original({ payload })] })
    await refreshEntityOriginals({ entityType: "venue_booking", entityId: "vb-1" }, io)
    assert.equal(calls.editOriginal.length, 1)
    const [, , html] = calls.editOriginal[0] as [string, number, string]
    assert.match(html, /Created by Creator[\s\S]*Updated by Editor.*17:00 UTC/)
    assert.equal(calls.enqueueDelivery.length, 0)
  })
})
