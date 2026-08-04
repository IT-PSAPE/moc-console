import { exchangeYouTubeCode, resolveYouTubeOAuthConfig } from "../../../server/youtube-oauth.js"
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
      response.status(400).json({ error: "Missing YouTube OAuth payload" })
      return
    }

    const config = resolveYouTubeOAuthConfig(process.env)
    const result = await exchangeYouTubeCode(config, code, redirectUri)
    if (!result.refresh_token) {
      throw new Error("YouTube did not return a refresh token; reconnect with offline access")
    }

    const tokenExpiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString()
    const admin = getSupabaseAdmin()
    const { error: connectionError } = await admin
      .from("youtube_connections")
      .upsert({
        workspace_id: workspaceId,
        channel_id: result.channel.channelId,
        channel_title: result.channel.channelTitle,
        token_expires_at: tokenExpiresAt,
        status: "active",
        connected_by: user.userId,
      }, { onConflict: "workspace_id" })

    if (connectionError) throw new Error(connectionError.message)
    await saveIntegrationTokens("youtube", workspaceId, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      tokenExpiresAt,
    })
    response.status(200).json({ channel: result.channel })
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
    console.error("YouTube connection failed:", error)
    response.status(500).json({ error: "YouTube connection failed" })
  }
}
