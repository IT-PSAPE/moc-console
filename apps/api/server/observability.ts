import { randomUUID } from "node:crypto"
import type { ApiRequest } from "./http.js"

const REQUEST_ID_HEADER = "x-request-id"
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/
const REQUIRED_RUNTIME_ENVIRONMENT = [
  "VITE_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "ALLOWED_ORIGINS",
] as const

export type ObservedApiResponse = {
  setHeader: (name: string, value: string) => void
  statusCode?: number
}

export type RuntimeReadiness = {
  ready: boolean
  deployment: string | null
}

export type RequestContext = {
  deployment: string | null
  requestId: string
  startedAt: number
}

export type ObservedApiHandler = (context: RequestContext) => Promise<void>

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

function requestId(headers: ApiRequest["headers"]): string {
  const candidate = headers?.[REQUEST_ID_HEADER] ?? headers?.[REQUEST_ID_HEADER.toUpperCase()]
  const value = Array.isArray(candidate) ? candidate[0] : candidate
  return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID()
}

function deploymentIdentifier(env: Record<string, string | undefined> = process.env): string | null {
  return env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? env.VERCEL_DEPLOYMENT_ID ?? null
}

function requestPath(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url, "https://moc.invalid").pathname
  } catch {
    return null
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}

export function getRuntimeReadiness(env: Record<string, string | undefined> = process.env): RuntimeReadiness {
  return {
    ready: REQUIRED_RUNTIME_ENVIRONMENT.every((name) => configured(env[name])),
    deployment: deploymentIdentifier(env),
  }
}

/**
 * Starts request correlation without exposing request bodies, headers, or
 * environment values. New entrypoints should call `observeApiRequest` so each
 * request has one stable ID in its response and one structured completion log.
 */
export function startApiRequest(request: ApiRequest, response: ObservedApiResponse): RequestContext {
  const context: RequestContext = {
    deployment: deploymentIdentifier(),
    requestId: requestId(request.headers),
    startedAt: Date.now(),
  }
  response.setHeader("X-Request-Id", context.requestId)
  response.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate")
  return context
}

export async function observeApiRequest(
  route: string,
  request: ApiRequest,
  response: ObservedApiResponse,
  handler: ObservedApiHandler,
): Promise<void> {
  const context = startApiRequest(request, response)
  let failed = false

  try {
    await handler(context)
  } catch (error) {
    failed = true
    console.error(JSON.stringify({
      deployment: context.deployment,
      error: errorMessage(error),
      event: "api.request.failed",
      requestId: context.requestId,
      route,
    }))
    throw error
  } finally {
    console.info(JSON.stringify({
      deployment: context.deployment,
      durationMs: Date.now() - context.startedAt,
      event: "api.request.completed",
      failed,
      method: request.method ?? null,
      path: requestPath(request.url),
      requestId: context.requestId,
      route,
      status: response.statusCode ?? null,
    }))
  }
}
