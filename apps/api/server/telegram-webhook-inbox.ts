import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'

export type TelegramWebhookClaim = 'claimed' | 'processed' | 'in_progress'

export function getTelegramUpdateId(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null
  const updateId = (body as { update_id?: unknown }).update_id
  return typeof updateId === 'number' && Number.isSafeInteger(updateId) && updateId >= 0 ? updateId : null
}

export async function claimTelegramWebhookUpdate(updateId: number, payload: unknown): Promise<TelegramWebhookClaim> {
  const [row] = await queryRows<QueryResultRow & { claim: unknown }>(
    'SELECT public.claim_telegram_webhook_update($1::bigint,$2::jsonb) AS claim',
    [updateId, JSON.stringify(payload)],
  )
  const claim = mapTelegramWebhookClaim(row?.claim)
  if (!claim) throw new Error('Could not claim Telegram webhook update: invalid database response')
  return claim
}

/** Older imported rows may still return `processing` for a live claim. */
export function mapTelegramWebhookClaim(data: unknown): TelegramWebhookClaim | null {
  if (data === 'claimed' || data === 'processed' || data === 'in_progress') return data
  if (data === 'processing') return 'in_progress'
  return null
}

export async function completeTelegramWebhookUpdate(updateId: number): Promise<void> {
  await queryRows('SELECT public.complete_telegram_webhook_update($1::bigint)', [updateId])
}

export async function failTelegramWebhookUpdate(updateId: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  try {
    await queryRows('SELECT public.fail_telegram_webhook_update($1::bigint,$2::text)', [updateId, message.slice(0, 1_000)])
  } catch (persistenceError) {
    console.error('Could not record Telegram webhook failure:', persistenceError instanceof Error ? persistenceError.message : String(persistenceError))
  }
}
