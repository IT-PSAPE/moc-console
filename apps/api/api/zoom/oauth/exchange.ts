import { exchangeZoomCode, resolveZoomOAuthConfig } from "../../../server/zoom-oauth.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../server/http.js"
import { saveIntegrationTokens } from "../../../server/integration-oauth-store.js"
import { getSupabaseAdmin } from "../../../server/supabase-admin.js"
import { WorkspaceAccessError, requireWorkspacePermission } from "../../../server/workspace-access.js"

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

    const code = typeof body.code === "string" ? body.code : null
    const redirectUri = typeof body.redirectUri === "string" ? body.redirectUri : null
    if (!code || !redirectUri) {
      response.status(400).json({ error: "Missing Zoom OAuth payload" })
      return
    }

    const config = resolveZoomOAuthConfig(process.env)
    const result = await exchangeZoomCode(config, code, redirectUri)
    const tokenExpiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString()
    const admin = getSupabaseAdmin()
    const { error: connectionError } = await admin
      .from("zoom_connections")
      .upsert({
        workspace_id: workspaceId,
        zoom_user_id: result.userInfo.zoomUserId,
        email: result.userInfo.email,
        display_name: result.userInfo.displayName,
        token_expires_at: tokenExpiresAt,
        connected_by: user.userId,
      }, { onConflict: "workspace_id" })

    if (connectionError) throw new Error(connectionError.message)
    await saveIntegrationTokens("zoom", workspaceId, {
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
