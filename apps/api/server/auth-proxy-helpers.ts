import type { ApiRequest, ApiResponse } from "./http.js"
import { headerValue } from "./http.js"

export type AuthProxyResponse = ApiResponse & { setHeader: (name: string, value: string | string[]) => void }
export const MAX_AUTH_BODY_BYTES = 64 * 1024
const AUTH_PATH = /^\/api\/auth\/(?:sign-up\/email|sign-in\/email|sign-out|get-session|send-verification-email|verify-email|request-password-reset|reset-password(?:\/[^/]+)?|change-password)$/

export function jsonAuthBody(body: unknown): string {
  return body === undefined || body === null ? "" : typeof body === "string" ? body : JSON.stringify(body)
}

export function authErrorResponse(response: AuthProxyResponse, status: number, code: string, message: string): void {
  response.status(status).json({ error: { code, message } })
}

export function normalizeAuthOrigins(origins: readonly string[]): Set<string> {
  return new Set(origins.map((origin) => new URL(origin).origin))
}

export function trustedRequestOrigin(request: ApiRequest, canonicalOrigin: string | undefined, trustedOrigins: Set<string>): string | null {
  const suppliedOrigin = headerValue(request.headers, "origin")
  const origin = suppliedOrigin ?? canonicalOrigin ?? null
  if (!origin) return null
  try {
    const normalized = new URL(origin).origin
    return normalized === origin && trustedOrigins.has(normalized) ? normalized : null
  } catch {
    return null
  }
}

export function authRequestPath(request: ApiRequest): { path: string; query: string } | null {
  try {
    const parsed = new URL(request.url ?? "/", "https://moc-api.invalid")
    if (!AUTH_PATH.test(parsed.pathname)) return null
    return { path: parsed.pathname, query: parsed.search }
  } catch {
    return null
  }
}
