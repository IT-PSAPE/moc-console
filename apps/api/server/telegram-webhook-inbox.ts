import { getSupabaseAdmin } from "./supabase-admin.js"

export type TelegramWebhookClaim = "claimed" | "processed" | "in_progress"

export function getTelegramUpdateId(body: unknown): number | null {
  if (!body || typeof body !== "object") return null
  const updateId = (body as { update_id?: unknown }).update_id
  return typeof updateId === "number" && Number.isSafeInteger(updateId) && updateId >= 0 ? updateId : null
}

export async function claimTelegramWebhookUpdate(updateId: number, payload: unknown): Promise<TelegramWebhookClaim> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc("claim_telegram_webhook_update", {
    p_update_id: updateId,
    p_payload: payload,
  })

  if (error) throw new Error(`Could not claim Telegram webhook update: ${error.message}`)
  if (data === "claimed" || data === "processed" || data === "in_progress") return data
  throw new Error("Could not claim Telegram webhook update: invalid database response")
}

export async function completeTelegramWebhookUpdate(updateId: number): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc("complete_telegram_webhook_update", { p_update_id: updateId })
  if (error) throw new Error(`Could not complete Telegram webhook update: ${error.message}`)
}

export async function failTelegramWebhookUpdate(updateId: number, error: unknown): Promise<void> {
  const admin = getSupabaseAdmin()
  const message = error instanceof Error ? error.message : String(error)
  const { error: persistenceError } = await admin.rpc("fail_telegram_webhook_update", {
    p_update_id: updateId,
    p_error: message.slice(0, 1_000),
  })
  if (persistenceError) console.error("Could not record Telegram webhook failure:", persistenceError.message)
}
