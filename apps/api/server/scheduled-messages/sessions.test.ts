import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ownedSession } from "./sessions.js"

type RestCall = { url: URL; method: string }

function makeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "session-1",
    user_id: "user-1",
    telegram_user_id: "456",
    workspace_id: "workspace-1",
    chat_id: "-100123",
    thread_id: 22,
    ephemeral_message_id: 81,
    occurrence_id: "occurrence-1",
    kind: "admin",
    data: {},
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  }
}

async function withRest<T>(
  responder: (call: RestCall) => Response | Promise<Response>,
  run: (calls: RestCall[]) => Promise<T>,
): Promise<T> {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env.VITE_SUPABASE_URL
  const previousKey = process.env.SUPABASE_SECRET_KEY
  process.env.VITE_SUPABASE_URL = "https://supabase.test"
  process.env.SUPABASE_SECRET_KEY = "test-service-key"
  const calls: RestCall[] = []
  globalThis.fetch = async (input, init) => {
    const call = { url: new URL(String(input)), method: init?.method ?? "GET" }
    calls.push(call)
    return responder(call)
  }
  try {
    return await run(calls)
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
    else process.env.VITE_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY
    else process.env.SUPABASE_SECRET_KEY = previousKey
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } })
}

function restResponse(call: RestCall, session = makeSession(), canUpdate = true): Response {
  if (call.url.pathname.endsWith("/scheduled_message_sessions")) return json(session)
  if (call.url.pathname.endsWith("/users")) return json({ id: "user-1" })
  if (call.url.pathname.endsWith("/workspace_users")) return json({ roles: { can_update: canUpdate } })
  return json({ message: `Unexpected REST request: ${call.url.pathname}` }, 500)
}

describe("ownedSession", () => {
  it("scopes the database lookup to its owner and origin chat", async () => {
    await withRest(call => {
      if (call.url.pathname.endsWith("/scheduled_message_sessions")) return json({ message: "no rows" }, 406)
      return json({ message: "The linked identity must not be checked for a non-owner" }, 500)
    }, async calls => {
      await assert.rejects(ownedSession("session-1", "999", "-100999", 81), /This flow has ended/)

      const lookup = calls[0]?.url
      assert.ok(lookup)
      assert.equal(lookup.searchParams.get("id"), "eq.session-1")
      assert.equal(lookup.searchParams.get("telegram_user_id"), "eq.999")
      assert.equal(lookup.searchParams.get("chat_id"), "eq.-100999")
      assert.ok(lookup.searchParams.has("expires_at"), "expired sessions must not be returned by the lookup")
      assert.equal(calls.length, 1)
    })
  })

  it("rejects an expired session before it can resolve identity or permissions", async () => {
    await withRest(call => {
      if (call.url.pathname.endsWith("/scheduled_message_sessions")) return json({ message: "no active row" }, 406)
      return json({ message: "No later authorization lookup should run" }, 500)
    }, async calls => {
      await assert.rejects(ownedSession("session-1", "456", "-100123", 81), /This flow has ended/)

      assert.match(calls[0]?.url.searchParams.get("expires_at") ?? "", /^gt\./)
      assert.equal(calls.length, 1)
    })
  })

  it("rejects a stale or forged ephemeral message control before authorizing the linked account", async () => {
    await withRest(call => restResponse(call), async calls => {
      await assert.rejects(ownedSession("session-1", "456", "-100123", 999), /belongs to another interaction/)

      assert.equal(calls.length, 1)
      assert.ok(calls[0]?.url.pathname.endsWith("/scheduled_message_sessions"))
    })
  })

  it("rejects a session after the Telegram account is linked to a different MOC user", async () => {
    await withRest(call => {
      if (call.url.pathname.endsWith("/users")) return json({ id: "different-user" })
      return restResponse(call)
    }, async calls => {
      await assert.rejects(ownedSession("session-1", "456", "-100123", 81), /Telegram link has changed/)

      assert.equal(calls.length, 2)
      assert.ok(calls[1]?.url.pathname.endsWith("/users"))
      assert.equal(calls[1]?.url.searchParams.get("telegram_chat_id"), "eq.456")
    })
  })

  it("rechecks management permission for every admin interaction instead of trusting the session", async () => {
    let permissionCheckCount = 0
    await withRest(call => {
      if (call.url.pathname.endsWith("/workspace_users")) {
        const isSecondCheck = permissionCheckCount++ > 0
        return json({ roles: { can_update: !isSecondCheck } })
      }
      return restResponse(call)
    }, async calls => {
      await ownedSession("session-1", "456", "-100123", 81)
      await assert.rejects(ownedSession("session-1", "456", "-100123", 81), /Insufficient workspace permission/)

      const permissionChecks = calls.filter(call => call.url.pathname.endsWith("/workspace_users"))
      assert.equal(permissionChecks.length, 2)
      assert.ok(permissionChecks.every(call => call.url.searchParams.get("workspace_id") === "eq.workspace-1"))
      assert.ok(permissionChecks.every(call => call.url.searchParams.get("user_id") === "eq.user-1"))
      assert.equal(permissionCheckCount, 2)
    })
  })

  it("allows an eligible participant session without requiring manager permission", async () => {
    await withRest(call => {
      const participant = makeSession({ kind: "attendance" })
      if (call.url.pathname.endsWith("/workspace_users")) {
        return json({ message: "Participants do not need management permission" }, 500)
      }
      return restResponse(call, participant)
    }, async calls => {
      const session = await ownedSession("session-1", "456", "-100123", 81)

      assert.equal(session.kind, "attendance")
      assert.equal(calls.some(call => call.url.pathname.endsWith("/workspace_users")), false)
    })
  })
})
