import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { getCurrentWorkspaceId } from "@/data/current-workspace"
import { exchangeZoomCodeForTokens } from "@/lib/zoom-client"

const ZOOM_CLIENT_ID = import.meta.env.VITE_ZOOM_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_ZOOM_REDIRECT_URI

const ZOOM_OAUTH_CODE_KEY = "zoom_oauth_code"
const ZOOM_OAUTH_ERROR_KEY = "zoom_oauth_error"
const ZOOM_OAUTH_PENDING_KEY = "zoom_oauth_pending"

export function useZoomOAuth() {
  const startOAuthFlow = useCallback(() => {
    // Set pending flag so supabase.ts can distinguish Zoom codes from Supabase PKCE
    sessionStorage.setItem(ZOOM_OAUTH_PENDING_KEY, "true")

    const params = new URLSearchParams({
      response_type: "code",
      client_id: ZOOM_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: [
        "meeting:read:meeting",
        "meeting:read:list_meetings",
        "meeting:write:meeting",
        "meeting:delete:meeting",
        "user:read:user",
      ].join(" "),
    })

    window.location.href = `https://zoom.us/oauth/authorize?${params}`
  }, [])

  const handleOAuthCallback = useCallback(async (): Promise<{ connected: boolean; error: string | null }> => {
    const oauthError = sessionStorage.getItem(ZOOM_OAUTH_ERROR_KEY)
    if (oauthError) {
      sessionStorage.removeItem(ZOOM_OAUTH_ERROR_KEY)
      return { connected: false, error: oauthError }
    }

    const code = sessionStorage.getItem(ZOOM_OAUTH_CODE_KEY)

    if (!code) {
      return { connected: false, error: null }
    }

    sessionStorage.removeItem(ZOOM_OAUTH_CODE_KEY)

    try {
      const connection = await exchangeZoomCodeForTokens(code, REDIRECT_URI)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const workspaceId = await getCurrentWorkspaceId()

      const { error: dbError } = await supabase
        .from("zoom_connections")
        .upsert(
          {
            workspace_id: workspaceId,
            zoom_user_id: connection.userInfo.zoomUserId,
            email: connection.userInfo.email,
            display_name: connection.userInfo.displayName,
            access_token: connection.access_token,
            refresh_token: connection.refresh_token,
            token_expires_at: new Date(Date.now() + connection.expires_in * 1000).toISOString(),
            connected_by: user.id,
          },
          { onConflict: "workspace_id" },
        )

      if (dbError) {
        throw new Error(dbError.message)
      }

      return { connected: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect Zoom"
      console.error("Zoom OAuth callback failed:", err)
      return { connected: false, error: message }
    }
  }, [])

  return { startOAuthFlow, handleOAuthCallback }
}
