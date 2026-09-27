import { apiUrl } from "@moc/utils/api-url"
import type { MiniAppErrorCode, MiniAppRequest, MiniAppResponse } from "@moc/notifications"

const ERROR_CODES: ReadonlySet<MiniAppErrorCode> = new Set(["unauthorized", "not_linked", "forbidden", "not_found", "invalid_transition", "invalid"])

const UNREACHABLE_RESPONSE: MiniAppResponse = {
  ok: false,
  error: "invalid",
  message: "Could not reach the server. Check your connection and try again.",
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Narrows a response body to MiniAppResponse. The endpoint also answers
 * rate limits, CORS and size checks with its own shapes, so anything else is
 * mapped to an "invalid" error the screen can always render.
 */
export function parseMiniAppResponse(status: number, body: unknown): MiniAppResponse {
  if (isObject(body) && body.ok === true && isObject(body.detail) && isObject(body.viewer)) {
    return body as MiniAppResponse
  }
  if (isObject(body) && body.ok === false && ERROR_CODES.has(body.error as MiniAppErrorCode)) {
    return { ok: false, error: body.error as MiniAppErrorCode, message: typeof body.message === "string" ? body.message : "" }
  }
  const message = status === 429 ? "Too many taps — wait a moment and try again." : "Something went wrong. Please try again."
  return { ok: false, error: "invalid", message }
}

/** POSTs a Mini App request to the API and parses its MiniAppResponse. Never throws. */
export async function postTelegramMiniApp(request: MiniAppRequest): Promise<MiniAppResponse> {
  try {
    const response = await fetch(apiUrl("/api/telegram/mini-app"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    })
    const body: unknown = await response.json().catch(() => null)
    return parseMiniAppResponse(response.status, body)
  } catch {
    return UNREACHABLE_RESPONSE
  }
}
