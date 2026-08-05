import { getIntegrationAccessToken, IntegrationNotConnectedError } from "../../../server/integration-access.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../server/http.js"
import { WorkspaceAccessError, requireWorkspacePermission } from "../../../server/workspace-access.js"

type RequestBody = {
  workspaceId?: unknown
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const user = await requireAuthenticatedUser(normaliseHeaders(request.headers))
    const body = (request.body ?? {}) as RequestBody
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null
    if (!workspaceId) {
      response.status(400).json({ error: "Missing workspace context" })
      return
    }
    await requireWorkspacePermission(user.userId, workspaceId, "can_read")
    await getIntegrationAccessToken("zoom", workspaceId)
    response.status(200).json({ ok: true })
    return
  } catch (error) {
    if (error instanceof AuthError) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }
    if (error instanceof WorkspaceAccessError) {
      response.status(403).json({ error: error.message })
      return
    }
    if (error instanceof IntegrationNotConnectedError) {
      response.status(404).json({ error: error.message })
      return
    }
    console.error("Zoom token refresh failed:", error)
    response.status(502).json({ error: "Zoom token refresh failed" })
  }
}
