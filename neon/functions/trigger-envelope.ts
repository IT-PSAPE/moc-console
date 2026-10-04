export type ScheduledTriggerEnvelope = {
  version: number
  invocation_id: string
  trigger: { type: 'schedule'; id: string; name: string }
  data?: Record<string, unknown>
}

export async function readScheduledTrigger(request: Request, expectedName: string): Promise<ScheduledTriggerEnvelope | null> {
  if (request.method !== 'POST') return null
  const invocationId = request.headers.get('x-neon-trigger-invocation-id')
  if (!invocationId || invocationId.length > 200) return null
  let envelope: unknown
  try {
    envelope = await request.json()
  } catch {
    return null
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return null
  const candidate = envelope as Partial<ScheduledTriggerEnvelope>
  if (candidate.version !== 1 || candidate.invocation_id !== invocationId) return null
  if (!candidate.trigger || candidate.trigger.type !== 'schedule' || candidate.trigger.name !== expectedName || typeof candidate.trigger.id !== 'string' || !candidate.trigger.id) return null
  if (candidate.data !== undefined && (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data))) return null
  return candidate as ScheduledTriggerEnvelope
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}
