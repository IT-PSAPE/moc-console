import { headerValue, type ApiRequest, type ApiResponse } from "./http.js"

// The API is deployed on its own origin (api.psape.co.za), so every browser
// call from MOC Console and MOC Request is cross-origin. Console integration
// calls carry a session header plus an explicit workspace context, which makes
// them preflighted requests.
//
// Allowed origins come from ALLOWED_ORIGINS (comma-separated). We echo the
// caller's origin rather than replying `*` because these requests carry
// credentials-in-headers, and `*` would let any site read the responses.
// An unset ALLOWED_ORIGINS allows nothing (fail closed) — server-to-server
// callers like Telegram webhooks and Vercel Cron send no Origin and are
// unaffected.

const ALLOWED_HEADERS = "content-type, authorization, x-moc-session, x-moc-workspace, x-signature"
const ALLOWED_METHODS = "GET, POST, PATCH, PUT, DELETE, OPTIONS"

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim().replace(/\/$/, ""))
    .filter(Boolean)
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  return allowedOrigins().includes(origin.replace(/\/$/, ""))
}

type HeaderSink = { setHeader: (name: string, value: string) => void }

/**
 * Writes the CORS response headers for `origin`, if it is allowed.
 * The low-level primitive — use `applyCors` unless your handler has a
 * non-standard response object (see the Zoom proxy).
 */
export function writeCorsHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
  response: HeaderSink,
  { preflight = false }: { preflight?: boolean } = {},
): void {
  const origin = headerValue(headers, "origin")

  if (isAllowedOrigin(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin as string)
    response.setHeader("Access-Control-Allow-Credentials", "true")
    // Caches keyed on the URL alone would serve one origin's ACAO header to
    // another; Vary makes the origin part of the cache key.
    response.setHeader("Vary", "Origin")
  }

  if (preflight) {
    response.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS)
    response.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS)
    response.setHeader("Access-Control-Max-Age", "86400")
  }
}

/**
 * Applies CORS headers and answers preflight.
 *
 * Returns `true` when the request has been fully handled (an OPTIONS
 * preflight) and the caller should return immediately.
 */
export function applyCors(request: ApiRequest, response: ApiResponse): boolean {
  const isPreflight = request.method === "OPTIONS"
  writeCorsHeaders(request.headers, response, { preflight: isPreflight })

  if (isPreflight) {
    response.status(204).json(null)
    return true
  }

  return false
}
