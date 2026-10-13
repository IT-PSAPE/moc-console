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
    let path = parsed.pathname
    // Plain Node functions receive one dynamic segment; deployment rewrites
    // carry nested auth routes through the same strict route allow-list.
    if (path === "/api/auth/_proxy" || path === "/api/auth/[...path]") {
      const rewrittenPaths = parsed.searchParams.getAll("authPath")
      if (rewrittenPaths.length !== 1) return null
      path = `/api/auth/${rewrittenPaths[0]}`
    }
    if (!AUTH_PATH.test(path)) return null
    parsed.searchParams.delete("authPath")
    parsed.searchParams.delete("path")
    return { path, query: parsed.search }
  } catch {
    return null
  }
}
