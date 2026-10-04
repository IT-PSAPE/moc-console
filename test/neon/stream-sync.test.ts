import { describe, expect, test } from 'vitest'
import type { PoolClient } from 'pg'
import { createStreamSyncHandler, STREAM_SYNC_TRIGGER_NAME } from '../../neon/functions/stream-sync'
import type { StreamSyncSummary } from '../../apps/api/server/streams/run-stream-sync'

const summary: StreamSyncSummary = {
  failures: [],
  youtube: { adopted: 0, reconciled: 2, deleted: 0, announced: 0, announceFailed: 0, deferred: 0, failed: 0, skipped: 0, synced: 2, workspaces: 1 },
  zoom: { adopted: 1, reconciled: 0, deleted: 0, announced: 1, announceFailed: 0, deferred: 0, failed: 0, skipped: 0, synced: 1, workspaces: 1 },
}

function request(name = STREAM_SYNC_TRIGGER_NAME, invocationId = 'invocation-1'): Request {
  return new Request('https://neon.example.test/functions/stream-sync', {
    method: 'POST',
    headers: { 'x-neon-trigger-invocation-id': invocationId, 'content-type': 'application/json' },
    body: JSON.stringify({
      version: 1,
      invocation_id: invocationId,
      trigger: { type: 'schedule', id: 'schedule-1', name },
    }),
  })
}

function actorRunner(locked: boolean, calls: string[]) {
  return async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = {
      query: async (text: string) => {
        calls.push(text)
        return { rows: [{ locked }] }
      },
    } as unknown as PoolClient
    return work(client)
  }
}

describe('Neon provider stream sync trigger', () => {
  test('requires a POST invocation with a matching Neon trigger envelope', async () => {
    let runs = 0
    const handler = createStreamSyncHandler({ run: async () => { runs += 1; return summary }, withActor: actorRunner(true, []) })
    const getResponse = await handler(new Request('https://neon.example.test/functions/stream-sync', { method: 'GET' }))
    expect(getResponse.status).toBe(405)
    const unsignedResponse = await handler(new Request('https://neon.example.test/functions/stream-sync', {
      method: 'POST', body: JSON.stringify({ version: 1, invocation_id: 'invocation-1', trigger: { type: 'schedule', id: 'schedule-1', name: STREAM_SYNC_TRIGGER_NAME } }),
    }))
    expect(unsignedResponse.status).toBe(403)
    const mismatchedResponse = await handler(request('another-schedule'))
    expect(mismatchedResponse.status).toBe(403)
    expect(runs).toBe(0)
  })

  test('runs the existing provider sweep under the worker advisory lease', async () => {
    const calls: string[] = []
    let runs = 0
    const handler = createStreamSyncHandler({ run: async () => { runs += 1; return summary }, withActor: actorRunner(true, calls) })
    const response = await handler(request())
    const body = await response.json() as { ok: boolean; invocationId: string; youtube: StreamSyncSummary['youtube'] }
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, invocationId: 'invocation-1', youtube: summary.youtube })
    expect(runs).toBe(1)
    expect(calls[0]).toContain('pg_try_advisory_xact_lock')
  })

  test('skips a concurrent scheduled invocation while preserving its invocation id', async () => {
    let runs = 0
    const handler = createStreamSyncHandler({ run: async () => { runs += 1; return summary }, withActor: actorRunner(false, []) })
    const response = await handler(request())
    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ ok: true, skipped: 'another stream sync is running', invocationId: 'invocation-1' })
    expect(runs).toBe(0)
  })

  test('keeps partial workspace failures successful but reports a failed sweep as a worker failure', async () => {
    const partial: StreamSyncSummary = {
      ...summary,
      failures: [{ provider: 'zoom', reason: 'rate_limited', workspaceId: 'workspace-1' }],
    }
    const partialHandler = createStreamSyncHandler({ run: async () => partial, withActor: actorRunner(true, []) })
    const partialResponse = await partialHandler(request())
    expect(partialResponse.status).toBe(200)
    expect(await partialResponse.json()).toMatchObject({ failures: partial.failures })

    const failingHandler = createStreamSyncHandler({ run: async () => { throw new Error('connection list unavailable') }, withActor: actorRunner(true, []) })
    const failedResponse = await failingHandler(request())
    expect(failedResponse.status).toBe(500)
    expect(await failedResponse.json()).toEqual({ error: 'Provider stream sync failed', invocationId: 'invocation-1' })
  })
})
