import { useCallback } from "react"
import { getCurrentWorkspaceId } from "@/data/current-workspace"
import { exchangeZoomCodeForTokens } from "@/lib/zoom-client"
import { generateOAuthState } from "@/lib/oauth-state"

const ZOOM_CLIENT_ID = import.meta.env.VITE_ZOOM_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_ZOOM_REDIRECT_URI

const ZOOM_OAUTH_CODE_KEY = "zoom_oauth_code"
const ZOOM_OAUTH_ERROR_KEY = "zoom_oauth_error"
const ZOOM_OAUTH_PENDING_KEY = "zoom_oauth_pending"
const ZOOM_OAUTH_STATE_KEY = "zoom_oauth_state"

export function useZoomOAuth() {
  const startOAuthFlow = useCallback(() => {
    // Set pending flag so supabase.ts can distinguish Zoom codes from Supabase PKCE
    sessionStorage.setItem(ZOOM_OAUTH_PENDING_KEY, "true")

    const state = generateOAuthState()
    sessionStorage.setItem(ZOOM_OAUTH_STATE_KEY, state)

    const params = new URLSearchParams({
      response_type: "code",
      client_id: ZOOM_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state,
      scope: [
        "meeting:read:list_meetings",
        "meeting:write:meeting",
        "meeting:update:meeting",
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
      const workspaceId = await getCurrentWorkspaceId()
      await exchangeZoomCodeForTokens(code, REDIRECT_URI, workspaceId)

      return { connected: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect Zoom"
      if (import.meta.env.DEV) {
        console.error("Zoom OAuth callback failed:", err)
      }
      return { connected: false, error: message }
    }
  }, [])

  return { startOAuthFlow, handleOAuthCallback }
}
