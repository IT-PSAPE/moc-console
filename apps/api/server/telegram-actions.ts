import type { TelegramAction, TelegramActionEntityType } from "@moc/notifications"

import { getSupabaseAdmin } from "./supabase-admin.js"

export type ApplyTelegramActionInput = {
  telegramUserId: string
  entityType: TelegramActionEntityType
  entityId: string
  action: TelegramAction
}

export type ApplyTelegramActionResult =
  | { ok: true; workspaceId: string; previousStatus: string; status: string; actorId: string; actorName: string }
  | { ok: false; error: "not_linked" | "forbidden" | "not_found" | "invalid_action" | "invalid_transition"; status?: string }

type ApplyTelegramActionError = Extract<ApplyTelegramActionResult, { ok: false }>["error"]

const KNOWN_ERRORS = new Set<ApplyTelegramActionError>(["not_linked", "forbidden", "not_found", "invalid_action", "invalid_transition"])

/** Maps the jsonb returned by `public.api_apply_telegram_action` to our result type. Exported for direct testing. */
export function mapApplyTelegramActionResult(data: unknown): ApplyTelegramActionResult {
  if (!data || typeof data !== "object") {
    throw new Error("Could not apply Telegram action: empty database response")
  }
  const row = data as Record<string, unknown>

  if (typeof row.error === "string") {
    const error = row.error as ApplyTelegramActionError
    if (!KNOWN_ERRORS.has(error)) {
      throw new Error(`Could not apply Telegram action: unknown error "${row.error}"`)
    }
    return { ok: false, error, status: typeof row.status === "string" ? row.status : undefined }
  }

  if (
    typeof row.workspaceId !== "string" ||
    typeof row.previousStatus !== "string" ||
    typeof row.status !== "string" ||
    typeof row.actorId !== "string" ||
    typeof row.actorName !== "string"
  ) {
    throw new Error("Could not apply Telegram action: malformed database response")
  }

  return {
    ok: true,
    workspaceId: row.workspaceId,
    previousStatus: row.previousStatus,
    status: row.status,
    actorId: row.actorId,
    actorName: row.actorName,
  }
}

export async function applyTelegramAction(input: ApplyTelegramActionInput): Promise<ApplyTelegramActionResult> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc("api_apply_telegram_action", {
    p_telegram_user_id: input.telegramUserId,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_action: input.action,
  })
  if (error) throw new Error(`Could not apply Telegram action: ${error.message}`)
  return mapApplyTelegramActionResult(data)
}
