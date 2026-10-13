import { randomUUID } from "node:crypto"
import type { PoolClient } from "pg"
import type { DatabaseActor } from "@moc/backend/database"
import type { AuthenticatedUser } from "../auth-guard.js"
import { writeCorsHeaders } from "../cors.js"
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse } from "../http.js"
import type { WorkspacePermission } from "../workspace-access.js"
import { parseCommand } from "./command.js"
import type { PlatformOperation } from "./context.js"
import { platformFailure } from "./errors.js"

export type PlatformRegistry = Record<string, Record<string, PlatformOperation>>
export type PlatformDependencies = {
  isAllowedOrigin: (origin: string | null) => boolean
  authenticate: (headers: Record<string, string | undefined>) => Promise<AuthenticatedUser>
  authorize: (userId: string, workspaceId: string, permission: WorkspacePermission | "can_write") => Promise<void>
  guardPublicOperation?: (request: ApiRequest, response: ApiResponse, capability: string, operation: string, workspaceId: string) => Promise<boolean>
  withActor: <T>(actor: DatabaseActor, work: (client: PoolClient) => Promise<T>) => Promise<T>
}

function privateErrorDetails(error: unknown): { error: string; code?: string; category?: string } {
  if (!(error instanceof Error)) return { error: "unknown" }
  const details = error as Error & { code?: unknown }
  const code = typeof details.code === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(details.code) ? details.code : undefined
  const timeoutCodes = new Set(["ETIMEDOUT", "ESOCKETTIMEDOUT"])
  const connectionCodes = new Set(["ECONNREFUSED", "ECONNRESET", "EPIPE", "08000", "08001", "08003", "08006", "57P03"])
  const category = code && timeoutCodes.has(code) ? "connection_timeout"
    : code && connectionCodes.has(code) ? "connection_error"
      : undefined
  return { error: error.name || "Error", ...(code ? { code } : {}), ...(category ? { category } : {}) }
}

export function createPlatformHandler(registry: PlatformRegistry, dependencies: PlatformDependencies) {
  return async function handlePlatform(request: ApiRequest, response: ApiResponse): Promise<void> {
    const requestId = randomUUID()
    response.setHeader("X-Request-Id", requestId)
    response.setHeader("Cache-Control", "no-store")
    writeCorsHeaders(request.headers, response, { preflight: request.method === "OPTIONS" })
    if (!dependencies.isAllowedOrigin(headerValue(request.headers, "origin"))) {
      response.status(403).json({ error: { code: "forbidden", message: "Origin not allowed" }, requestId })
      return
    }
    if (request.method === "OPTIONS") { response.status(204).json(null); return }
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST, OPTIONS")
      response.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed" }, requestId })
      return
    }
    let commandMetadata: { capability?: string; operation?: string } = {}
    try {
      const command = parseCommand(request)
      commandMetadata = { capability: command.capability.slice(0, 64), operation: command.operation.slice(0, 64) }
      const capability = Object.hasOwn(registry, command.capability) ? registry[command.capability] : undefined
      const operation = capability && Object.hasOwn(capability, command.operation) ? capability[command.operation] : undefined
      if (!operation) {
        response.status(404).json({ error: { code: "not_found", message: "Unknown operation" }, requestId })
        return
      }
      if (operation.permission === "public" && dependencies.guardPublicOperation &&
          !await dependencies.guardPublicOperation(request, response, command.capability, command.operation, command.workspaceId)) return
      let userId = ""
      if (operation.permission !== "public") {
        const user = await dependencies.authenticate(normaliseHeaders(request.headers))
        userId = user.userId
        if (operation.permission !== "authenticated") {
          if (!command.workspaceId) {
            response.status(400).json({ error: { code: "invalid_input", message: "Select a workspace" }, requestId })
            return
          }
          await dependencies.authorize(userId, command.workspaceId, operation.permission)
        }
      }
      const result = await dependencies.withActor({
        userId: userId || null,
        workspaceId: command.workspaceId || null,
        role: operation.permission === "public" ? "moc_public" : "moc_app",
      }, async (db) => operation.run({ db, userId, workspaceId: command.workspaceId }, command.input))
      response.status(200).json(result ?? null)
    } catch (error) {
      const failure = platformFailure(error)
      if (failure.status >= 500) console.error(JSON.stringify({ event: "platform.operation.failed", requestId, ...commandMetadata, ...privateErrorDetails(error) }))
      response.status(failure.status).json({ error: { code: failure.code, message: failure.message }, requestId })
    }
  }
}
