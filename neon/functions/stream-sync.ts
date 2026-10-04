import type { PoolClient } from 'pg'
import { withActor } from '@moc/backend/database'
import { runStreamSync, type StreamSyncSummary } from '../../apps/api/server/streams/run-stream-sync.js'
import { jsonResponse, readScheduledTrigger } from './trigger-envelope.js'

export const STREAM_SYNC_TRIGGER_NAME = 'moc-provider-stream-sync-daily'

type ActorRunner = <T>(work: (client: PoolClient) => Promise<T>) => Promise<T>

const withWorkerActor: ActorRunner = (work) => withActor(
  { userId: null, workspaceId: null, role: 'moc_worker' },
  work,
)

type StreamSyncHandlerDependencies = {
  run: () => Promise<StreamSyncSummary>
  withActor: ActorRunner
}

async function runWithLease(run: () => Promise<StreamSyncSummary>, actorRunner: ActorRunner): Promise<StreamSyncSummary | null> {
  return actorRunner(async (client) => {
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock(hashtextextended('moc-provider-stream-sync', 0)) AS locked",
    )
    if (!result.rows[0]?.locked) return null
    return run()
  })
}

export function createStreamSyncHandler(dependencies: StreamSyncHandlerDependencies = { run: runStreamSync, withActor: withWorkerActor }) {
  return async function handleStreamSync(request: Request): Promise<Response> {
    const envelope = await readScheduledTrigger(request, STREAM_SYNC_TRIGGER_NAME)
    if (!envelope) return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Invalid scheduled trigger invocation' })

    try {
      const summary = await runWithLease(dependencies.run, dependencies.withActor)
      if (!summary) return jsonResponse(202, { ok: true, skipped: 'another stream sync is running', invocationId: envelope.invocation_id })
      return jsonResponse(200, { ok: true, invocationId: envelope.invocation_id, ...summary })
    } catch (error) {
      console.error('Provider stream sync trigger failed', error)
      return jsonResponse(500, { error: 'Provider stream sync failed', invocationId: envelope.invocation_id })
    }
  }
}

export default createStreamSyncHandler()
