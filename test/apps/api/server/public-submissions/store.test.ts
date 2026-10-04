import { describe, expect, test } from "vitest"
import { createPublicSubmissionStore, SubmissionConflictError, SubmissionStaleError } from "../../../../../apps/api/server/public-submissions/store.js"

describe("pg public submission store", () => {
  test("uses only tracking functions and parameterizes the secret", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = []
    const store = createPublicSubmissionStore(async <Row>(sql: string, values: readonly unknown[] = []) => {
      calls.push({ sql, values })
      return [{ result: null }] as Row[]
    })

    await expect(store.lookup("REQ-ABC123' OR true --")).resolves.toBeNull()
    expect(calls).toEqual([{
      sql: "SELECT public.api_lookup_tracking_submission($1::text) AS result",
      values: ["REQ-ABC123' OR true --"],
    }])
  })

  test("maps optimistic conflict envelopes to the existing store errors", async () => {
    const stale = createPublicSubmissionStore(async <Row>() => [{ result: { error: "stale" } }] as Row[])
    const conflict = createPublicSubmissionStore(async <Row>() => [{ result: { error: "conflict" } }] as Row[])

    await expect(stale.update("REQ-ABC123", "request", "2030-01-01T00:00:00.000Z", {})).rejects.toBeInstanceOf(SubmissionStaleError)
    await expect(conflict.update("VEN-ABC123", "venue_booking", "2030-01-01T00:00:00.000Z", {})).rejects.toBeInstanceOf(SubmissionConflictError)
  })

  test("updates through the fixed SQL function while binding the optimistic version and payload", async () => {
    const tracking = { id: "11111111-1111-4111-8111-111111111111", trackingCode: "REQ-ABC123", type: "request" as const, title: "New title", status: "not_started", createdAt: "2030-01-01T00:00:00.000Z", updatedAt: "2030-01-02T00:00:00.000Z" }
    const calls: Array<{ sql: string; values: readonly unknown[] }> = []
    const store = createPublicSubmissionStore(async <Row>(sql: string, values: readonly unknown[] = []) => {
      calls.push({ sql, values })
      return [{ result: { entityId: tracking.id, submission: tracking } }] as Row[]
    })
    const payload = { title: "New title" }

    await expect(store.update("REQ-ABC123", "request", "2030-01-01T00:00:00.000Z", payload)).resolves.toMatchObject({ entityId: tracking.id, submission: { title: "New title" } })
    expect(calls).toEqual([{
      sql: "SELECT public.api_update_tracking_submission($1::text, $2::text, $3::timestamptz, $4::jsonb) AS result",
      values: ["REQ-ABC123", "request", "2030-01-01T00:00:00.000Z", payload],
    }])
  })
})
