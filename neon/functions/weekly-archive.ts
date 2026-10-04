import { runWeeklyArchive } from '@moc/backend/workers/weekly-archive'
import { jsonResponse, readScheduledTrigger } from './trigger-envelope.js'

const TRIGGER_NAME = 'moc-weekly-archive'

export default async function fetch(request: Request): Promise<Response> {
  const envelope = await readScheduledTrigger(request, TRIGGER_NAME)
  if (!envelope) return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Invalid scheduled trigger invocation' })
  try {
    return jsonResponse(200, { ok: true, invocationId: envelope.invocation_id, ...await runWeeklyArchive() })
  } catch (error) {
    console.error('Weekly archive trigger failed', error)
    return jsonResponse(500, { error: 'Weekly archive failed' })
  }
}
