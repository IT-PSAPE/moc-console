import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { runWithSqlFixture, setSqlFixture } from "./sql-fixture.js"

const {
  completeIntegrationTokenRefresh,
  getIntegrationTokens,
  saveIntegrationConnection,
  tryAcquireIntegrationRefreshLock,
} = await import("../../../../apps/api/server/integration-oauth-store.js")

type QueryCall = { text: string; values: readonly unknown[] }
const queryCalls: QueryCall[] = []
const actorCalls: QueryCall[] = []

function rowsFor(text: string): Array<Record<string, unknown>> {
  if (text.includes("SELECT access_token")) return [{ access_token: "access-1", refresh_token: "refresh-1", token_expires_at: "2030-01-01T00:00:00Z" }]
  if (text.includes("RETURNING refresh_lock_id")) return [{ refresh_lock_id: "00000000-0000-4000-8000-000000000001" }]
  if (text.includes("RETURNING refresh_token")) return [{ refresh_token: "refresh-2" }]
  if (text.includes("SELECT zoom_user_id")) return [{ zoom_user_id: "old-zoom-user" }]
  return []
}

async function withFixture(work: () => Promise<void>): Promise<void> {
  await runWithSqlFixture(async () => {
    setSqlFixture({
      queryRows: async (text, values) => {
        queryCalls.push({ text, values })
        return rowsFor(text)
      },
      queryActor: async (text, values) => {
        actorCalls.push({ text, values })
        return rowsFor(text)
      },
    })
    await work()
  })
}

describe("PostgreSQL integration OAuth store", () => {
  it("reads credentials only by provider and workspace from the private schema", async () => {
    queryCalls.length = 0
    await withFixture(async () => {
      assert.deepEqual(await getIntegrationTokens("youtube", "workspace-1"), {
        accessToken: "access-1", refreshToken: "refresh-1", tokenExpiresAt: "2030-01-01T00:00:00Z",
      })
    })
    assert.match(queryCalls[0]?.text ?? "", /FROM moc_private\.integration_oauth_tokens/)
    assert.deepEqual(queryCalls[0]?.values, ["youtube", "workspace-1"])
  })

  it("acquires and completes refresh leases only for the expected token and lease id", async () => {
    queryCalls.length = 0
    await withFixture(async () => {
      assert.equal(await tryAcquireIntegrationRefreshLock("zoom", "workspace-1", "refresh-1", "00000000-0000-4000-8000-000000000001", "2030-01-01T00:00:00Z"), true)
      assert.equal(await completeIntegrationTokenRefresh("zoom", "workspace-1", "refresh-1", "00000000-0000-4000-8000-000000000001", {
        accessToken: "access-2", refreshToken: "refresh-2", tokenExpiresAt: "2030-01-02T00:00:00Z",
      }), true)
    })
    assert.match(queryCalls[0]?.text ?? "", /refresh_token=\$3/)
    assert.match(queryCalls[0]?.text ?? "", /refresh_lock_expires_at <= now\(\)/)
    assert.match(queryCalls[1]?.text ?? "", /refresh_lock_id=\$4/)
    assert.match(queryCalls[1]?.text ?? "", /refresh_lock_expires_at > now\(\)/)
  })

  it("deletes the old Zoom connection before inserting replacement credentials", async () => {
    actorCalls.length = 0
    await withFixture(async () => {
      await saveIntegrationConnection("workspace-1", {
        provider: "zoom",
        connection: { zoomUserId: "new-zoom-user", email: "new@example.test", displayName: "New", connectedBy: "user-1" },
      }, { accessToken: "access", refreshToken: "refresh", tokenExpiresAt: "2030-01-01T00:00:00Z" })
    })

    const queries = actorCalls.map((call) => call.text)
    const deleteConnection = queries.findIndex((query) => query.includes("DELETE FROM public.zoom_connections"))
    const saveTokens = queries.findIndex((query) => query.includes("INSERT INTO moc_private.integration_oauth_tokens"))
    assert.ok(deleteConnection >= 0 && saveTokens >= 0 && deleteConnection < saveTokens)
    assert.ok(queries.some((query) => query.includes("INSERT INTO public.zoom_connections")))
  })
})
