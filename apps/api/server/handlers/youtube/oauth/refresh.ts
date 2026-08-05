import { getIntegrationAccessToken, IntegrationNotConnectedError, YouTubeReauthRequiredError } from "../../../integration-access.js"
import { AuthError, requireAuthenticatedUser } from "../../../auth-guard.js"
import { applyCors } from "../../../cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../http.js"
import { allowOAuthMutation } from "../../../oauth-rate-limit.js"
import { WorkspaceAccessError, requireWorkspacePermission } from "../../../workspace-access.js"

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
    if (!await allowOAuthMutation(response, user.userId, workspaceId, "youtube", "refresh")) return
    await getIntegrationAccessToken("youtube", workspaceId)
    response.status(200).json({ ok: true })
    return
  } catch (error) {
    if (error instanceof AuthError) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }
    if (error instanceof YouTubeReauthRequiredError) {
      response.status(401).json({ error: error.message, code: "reauth_required" })
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
    console.error("YouTube token refresh failed:", error)
    response.status(502).json({ error: "YouTube token refresh failed" })
  }
}
