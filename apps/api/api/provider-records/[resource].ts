import { AuthError, requireAuthenticatedUser, type AuthenticatedUser } from "../../server/auth-guard.js"
import { applyCors } from "../../server/cors.js"
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse } from "../../server/http.js"
import { isUuid } from "../../server/notifications/signed-ingest.js"
import { observeApiRequest } from "../../server/observability.js"
import {
  isProviderRecordsResource,
  readProviderRecords,
  type ProviderRecordsResource,
} from "../../server/provider-records.js"
import { routeParameterValue, type ApiHandler } from "../../server/route-dispatch.js"
import {
  requireWorkspacePermission,
  WorkspaceAccessError,
  type WorkspacePermission,
} from "../../server/workspace-access.js"

export type ProviderRecordsHandlerDependencies = {
  authenticate: (headers: Record<string, string | undefined> | undefined) => Promise<AuthenticatedUser>
  authorize: (userId: string, workspaceId: string, permission: WorkspacePermission) => Promise<void>
  readRecords: (resource: ProviderRecordsResource, workspaceId: string, id: string | null) => Promise<unknown[]>
}

const productionDependencies: ProviderRecordsHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  authorize: requireWorkspacePermission,
  readRecords: readProviderRecords,
}

async function handleProviderRecords(
  request: ApiRequest,
  response: ApiResponse,
  dependencies: ProviderRecordsHandlerDependencies,
): Promise<void> {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const resource = routeParameterValue(request, "resource")
  if (!isProviderRecordsResource(resource)) {
    response.status(404).json({ error: "Not found" })
    return
  }

  const workspaceId = headerValue(request.headers, "x-moc-workspace")
  if (!workspaceId) {
    response.status(400).json({ error: "Missing workspace context" })
    return
  }

  const id = routeParameterValue(request, "id")
  if (id && !isUuid(id)) {
    response.status(400).json({ error: "Invalid record ID" })
    return
  }

  let user: AuthenticatedUser
  try {
    user = await dependencies.authenticate(normaliseHeaders(request.headers))
  } catch (error) {
    response.status(error instanceof AuthError ? 401 : 503).json({ error: error instanceof AuthError ? "Unauthorized" : "Authentication unavailable" })
    return
  }

  try {
    await dependencies.authorize(user.userId, workspaceId, "can_read")
  } catch (error) {
    response.status(error instanceof WorkspaceAccessError ? 403 : 503).json({ error: error instanceof WorkspaceAccessError ? "Insufficient workspace permission" : "Workspace access unavailable" })
    return
  }

  try {
    const records = await dependencies.readRecords(resource, workspaceId, id)
    response.status(200).json({ records })
  } catch {
    response.status(503).json({ error: "Provider records are temporarily unavailable" })
  }
}

export function createProviderRecordsHandler(
  dependencies: ProviderRecordsHandlerDependencies = productionDependencies,
): ApiHandler {
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    await observeApiRequest("provider-records", request, response, async () => {
      await handleProviderRecords(request, response, dependencies)
    })
  }
}

export default createProviderRecordsHandler()
