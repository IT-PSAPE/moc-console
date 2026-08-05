import { exchangeZoomCode, resolveZoomOAuthConfig, resolveZoomRedirectUri } from "../../../zoom-oauth.js"
import { AuthError, requireAuthenticatedUser } from "../../../auth-guard.js"
import { applyCors } from "../../../cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../http.js"
import { saveIntegrationConnection } from "../../../integration-oauth-store.js"
import { allowOAuthMutation } from "../../../oauth-rate-limit.js"
import { WorkspaceAccessError, requireWorkspacePermission } from "../../../workspace-access.js"

type RequestBody = {
  code?: unknown
  redirectUri?: unknown
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
    await requireWorkspacePermission(user.userId, workspaceId, "can_manage_roles")
    if (!await allowOAuthMutation(response, user.userId, workspaceId, "zoom", "exchange")) return

    const code = typeof body.code === "string" ? body.code : null
    const redirectUri = typeof body.redirectUri === "string" ? body.redirectUri : null
    if (!code || !redirectUri) {
      response.status(400).json({ error: "Missing Zoom OAuth payload" })
      return
    }

    const config = resolveZoomOAuthConfig(process.env)
    const configuredRedirectUri = resolveZoomRedirectUri(process.env)
    if (redirectUri !== configuredRedirectUri) {
      response.status(400).json({ error: "Invalid Zoom redirect URI" })
      return
    }
    const result = await exchangeZoomCode(config, code, configuredRedirectUri)
    const tokenExpiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString()
    await saveIntegrationConnection(workspaceId, {
      provider: "zoom",
      connection: {
        zoomUserId: result.userInfo.zoomUserId,
        email: result.userInfo.email,
        displayName: result.userInfo.displayName,
        connectedBy: user.userId,
      },
    }, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      tokenExpiresAt,
    })
    response.status(200).json({ userInfo: result.userInfo })
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
    console.error("Zoom connection failed:", error)
    response.status(500).json({ error: "Zoom connection failed" })
  }
}
