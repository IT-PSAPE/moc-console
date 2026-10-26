export type ScheduledHistoryCursor = { workspaceId: string; sendOn: string; id: string }

export function decodeScheduledHistoryCursor(value: unknown, workspaceId: string): ScheduledHistoryCursor | null {
  if (value === undefined || value === null) return null
  try {
    if (typeof value !== 'string' || value.length > 1000 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid cursor')
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid cursor')
    const record = parsed as Record<string, unknown>
    const { sendOn, id } = record
    if (record.workspaceId !== workspaceId || typeof sendOn !== 'string' || typeof id !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}Z$/.test(sendOn) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid cursor')
    const date = new Date(sendOn)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== sendOn.slice(0, 19)) throw new Error('Invalid cursor')
    return { workspaceId, sendOn, id: id.toLowerCase() }
  } catch {
    throw new Error('Invalid scheduled history cursor')
  }
}

export function encodeScheduledHistoryCursor(cursor: ScheduledHistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}
