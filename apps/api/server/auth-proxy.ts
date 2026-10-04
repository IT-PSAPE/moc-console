import { createAuthNonce, createInternalAuthHeaders } from "../../../packages/backend/src/auth/internal-request.js"
import type { ApiRequest } from "./http.js"
import { headerValue } from "./http.js"
import { authErrorResponse, authRequestPath, jsonAuthBody, MAX_AUTH_BODY_BYTES, normalizeAuthOrigins, trustedRequestOrigin, type AuthProxyResponse } from "./auth-proxy-helpers.js"

export type AuthProxyOptions = {
  functionUrl: string
  secret: string
  trustedOrigins: readonly string[]
  canonicalOrigin?: string
  now?: () => number
  nonce?: () => string
  fetch?: typeof fetch
}

export function createAuthProxyHandler(options: AuthProxyOptions) {
  const trustedOrigins = normalizeAuthOrigins(options.trustedOrigins)
  const fetchImpl = options.fetch ?? fetch
  const makeNonce = options.nonce ?? createAuthNonce
  const now = options.now ?? Date.now

  return async function handleAuthProxy(request: ApiRequest, response: AuthProxyResponse): Promise<void> {
    response.setHeader("Cache-Control", "no-store")
    const method = (request.method ?? "GET").toUpperCase()
    if (method !== "GET" && method !== "POST") {
      response.setHeader("Allow", "GET, POST")
      authErrorResponse(response, 405, "method_not_allowed", "Method not allowed")
      return
    }

    const path = authRequestPath(request)
    if (!path) {
      authErrorResponse(response, 404, "not_found", "Auth route not found")
      return
    }

    const origin = trustedRequestOrigin(request, options.canonicalOrigin, trustedOrigins)
    if (!origin) {
      authErrorResponse(response, 403, "untrusted_origin", "Request origin is not allowed")
      return
    }

    const body = method === "POST" ? jsonAuthBody(request.body) : ""
    if (Buffer.byteLength(body, "utf8") > MAX_AUTH_BODY_BYTES) {
      authErrorResponse(response, 413, "request_too_large", "Auth request body is too large")
      return
    }
    const callerContentType = headerValue(request.headers, "content-type")
    if (method === "POST" && callerContentType && !callerContentType.toLowerCase().startsWith("application/json")) {
      authErrorResponse(response, 415, "unsupported_media_type", "Auth requests must use JSON")
      return
    }

    const cookie = headerValue(request.headers, "cookie") ?? ""
    const signedRequest = { method, path: `${path.path}${path.query}`, body, origin, cookie, timestamp: now(), nonce: makeNonce() }
    const signedHeaders = createInternalAuthHeaders(signedRequest, options.secret)
    const target = new URL(`${options.functionUrl.replace(/\/$/, "")}${path.path}${path.query}`)
    const headers = new Headers({
      ...signedHeaders,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    })

    try {
      const upstream = await fetchImpl(target, { method, headers, redirect: "manual", ...(method === "POST" ? { body } : {}) })
      response.status(upstream.status)
      response.setHeader("Cache-Control", "no-store")
      const contentType = upstream.headers.get("content-type")
      const location = upstream.headers.get("location")
      if (contentType) response.setHeader("Content-Type", contentType)
      if (location) response.setHeader("Location", location)
      const setCookies = upstream.headers.getSetCookie?.() ?? (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie") as string] : [])
      if (setCookies.length) response.setHeader("Set-Cookie", setCookies)
      const text = await upstream.text()
      if (response.end) response.end(text)
      else response.json(text ? JSON.parse(text) as unknown : null)
    } catch {
      authErrorResponse(response, 503, "auth_unavailable", "Authentication service is unavailable")
    }
  }
}

export default async function handler(request: ApiRequest, response: AuthProxyResponse): Promise<void> {
  const functionUrl = process.env.NEON_AUTH_FUNCTION_URL
  const secret = process.env.MOC_AUTH_SERVICE_SECRET
  const trustedOrigins = (process.env.MOC_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)
  const canonicalOrigin = process.env.MOC_CONSOLE_ORIGIN
  if (!functionUrl || !secret || trustedOrigins.length === 0) {
    authErrorResponse(response, 503, "auth_unavailable", "Authentication service is not configured")
    return
  }

  await createAuthProxyHandler({ functionUrl, secret, trustedOrigins, canonicalOrigin })(request, response)
}

export function createAuthSessionResolver(options: AuthProxyOptions): (cookie: string, origin?: string) => Promise<unknown> {
  const trustedOrigins = normalizeAuthOrigins(options.trustedOrigins)
  const fetchImpl = options.fetch ?? fetch
  const now = options.now ?? Date.now
  const makeNonce = options.nonce ?? createAuthNonce

  return async function resolveSession(cookie: string, requestedOrigin?: string): Promise<unknown> {
    const originValue = requestedOrigin ?? options.canonicalOrigin ?? ""
    let origin: string
    try {
      origin = new URL(originValue).origin
    } catch {
      throw new Error("Auth origin is not configured")
    }
    if (origin !== originValue || !trustedOrigins.has(origin)) throw new Error("Auth origin is not trusted")

    const signedRequest = { method: "GET", path: "/api/auth/get-session", body: "", origin, cookie, timestamp: now(), nonce: makeNonce() }
    const headers = new Headers({ ...createInternalAuthHeaders(signedRequest, options.secret), ...(cookie ? { cookie } : {}) })
    const target = new URL(`${options.functionUrl.replace(/\/$/, "")}${signedRequest.path}`)
    const response = await fetchImpl(target, { method: "GET", headers })
    if (!response.ok) throw new Error("Auth session lookup failed")
    return await response.json() as unknown
  }
}
