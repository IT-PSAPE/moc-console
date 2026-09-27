// POST /api/telegram/mini-app — the Telegram Mini App's single endpoint
// (apps/request /tg). CORS + a bounded body + per-Telegram-user rate limiting
// gate every request; initData is HMAC-verified before any op runs.

import type { MiniAppErrorCode, MiniAppRequest, MiniAppResponse } from "@moc/notifications"
import { applyCors, isAllowedOrigin } from "../cors.js"
import { headerValue, type ApiRequest, type ApiResponse } from "../http.js"
import {
  RATE_LIMIT_POLICIES,
  consumeRateLimit,
  hashRateLimitSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
  type RateLimitDecision,
} from "../rate-limit.js"
import { handleAction } from "./action-op.js"
import { handleChecklistToggle } from "./checklist-toggle-op.js"
import { verifyInitData } from "./initdata.js"
import { parseMiniAppRequest } from "./input.js"
import { handleScanComplete } from "./scan-complete-op.js"
import { handleView } from "./view-op.js"

const MAX_BODY_BYTES = 16 * 1_024
const ALLOWED_METHODS = "POST, OPTIONS"

export type TelegramMiniAppDeps = {
  verify: (initData: string, botToken: string | undefined) => ReturnType<typeof verifyInitData>
  botToken: () => string | undefined
  limit: (telegramUserId: string) => Promise<RateLimitDecision>
  dispatch: (telegramUserId: string, request: MiniAppRequest) => Promise<MiniAppResponse>
}

async function dispatchOp(telegramUserId: string, request: MiniAppRequest): Promise<MiniAppResponse> {
  if (request.op === "view") return handleView(telegramUserId, request.target)
  if (request.op === "action") return handleAction(telegramUserId, request.entityType, request.entityId, request.action)
  if (request.op === "checklist.toggle") return handleChecklistToggle(telegramUserId, request.checklistId, request.itemId, request.checked)
  return handleScanComplete(telegramUserId, request.bookingId, request.mode, request.scannedItemIds)
}

async function limitByTelegramUser(telegramUserId: string): Promise<RateLimitDecision> {
  const subject = hashRateLimitSubject(["telegram-mini-app", telegramUserId])
  return consumeRateLimit(RATE_LIMIT_POLICIES.telegramMiniApp, subject)
}

const defaultDependencies: TelegramMiniAppDeps = {
  verify: verifyInitData,
  botToken: () => process.env.TELEGRAM_BOT_TOKEN,
  limit: limitByTelegramUser,
  dispatch: dispatchOp,
}

function writeError(response: ApiResponse, status: number, error: string): void {
  response.status(status).json({ error })
}

function hasBoundedBody(request: ApiRequest): boolean {
  const contentLength = headerValue(request.headers, "content-length")
  if (contentLength !== null) return /^\d+$/.test(contentLength) && Number(contentLength) <= MAX_BODY_BYTES
  try {
    return JSON.stringify(request.body ?? null).length <= MAX_BODY_BYTES
  } catch {
    return false
  }
}

const ERROR_STATUS: Record<MiniAppErrorCode, number> = {
  unauthorized: 401,
  not_linked: 403,
  forbidden: 403,
  not_found: 404,
  invalid_transition: 409,
  invalid: 400,
}

function writeMiniAppResponse(response: ApiResponse, result: MiniAppResponse): void {
  if (result.ok) return response.status(200).json(result)
  response.status(ERROR_STATUS[result.error]).json(result)
}

export async function handleTelegramMiniApp(
  request: ApiRequest,
  response: ApiResponse,
  deps: TelegramMiniAppDeps = defaultDependencies,
): Promise<void> {
  response.setHeader("Content-Type", "application/json")
  response.setHeader("Cache-Control", "no-store")
  if (applyCors(request, response)) return
  if (!isAllowedOrigin(headerValue(request.headers, "origin"))) return writeError(response, 403, "Forbidden origin")

  if (request.method !== "POST") {
    response.setHeader("Allow", ALLOWED_METHODS)
    return writeError(response, 405, "Method not allowed")
  }

  if (!hasBoundedBody(request)) return writeError(response, 413, "Request body is too large")

  const parsed = parseMiniAppRequest(request.body)
  if (typeof parsed === "string") return writeError(response, 400, parsed)

  const verification = deps.verify(parsed.initData, deps.botToken())
  if (!verification.ok) return writeMiniAppResponse(response, { ok: false, error: "unauthorized", message: "Your session has expired — reopen this from Telegram." })

  let decision: RateLimitDecision
  try {
    decision = await deps.limit(verification.telegramUserId)
  } catch {
    return writeRateLimitUnavailable(response)
  }
  if (!decision.allowed) return writeRateLimitExceeded(response, decision)

  try {
    const result = await deps.dispatch(verification.telegramUserId, parsed)
    writeMiniAppResponse(response, result)
  } catch {
    writeMiniAppResponse(response, { ok: false, error: "invalid", message: "Something went wrong. Please try again." })
  }
}
