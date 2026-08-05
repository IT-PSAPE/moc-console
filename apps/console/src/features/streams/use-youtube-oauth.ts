import { useCallback } from "react"
import { getCurrentWorkspaceId } from "@/data/current-workspace"
import { exchangeCodeForTokens } from "@/lib/youtube-client"
import { generateOAuthState } from "@/lib/oauth-state"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI
const YOUTUBE_OAUTH_CODE_KEY = "youtube_oauth_code"
const YOUTUBE_OAUTH_ERROR_KEY = "youtube_oauth_error"
const YOUTUBE_OAUTH_STATE_KEY = "youtube_oauth_state"

const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ")

export function useYouTubeOAuth() {
  /** Redirect to Google consent screen. */
  const startOAuthFlow = useCallback(() => {
    const state = generateOAuthState()
    sessionStorage.setItem(YOUTUBE_OAUTH_STATE_KEY, state)

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    })

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }, [])

  /**
   * Check if we just returned from OAuth with a ?code= param.
   * If so, exchange the code and let the server store the connection tokens.
   * Returns { connected, error } indicating the result.
   */
  const handleOAuthCallback = useCallback(async (): Promise<{ connected: boolean; error: string | null }> => {
    const oauthError = sessionStorage.getItem(YOUTUBE_OAUTH_ERROR_KEY)
    if (oauthError) {
      sessionStorage.removeItem(YOUTUBE_OAUTH_ERROR_KEY)
      return { connected: false, error: oauthError }
    }

    // The code was stashed in sessionStorage by supabase.ts before Supabase could intercept it
    const code = sessionStorage.getItem(YOUTUBE_OAUTH_CODE_KEY)

    if (!code) {
      return { connected: false, error: null }
    }

    // Clear immediately so it's not reprocessed on next mount
    sessionStorage.removeItem(YOUTUBE_OAUTH_CODE_KEY)

    try {
      const workspaceId = await getCurrentWorkspaceId()
      await exchangeCodeForTokens(code, REDIRECT_URI, workspaceId)

      return { connected: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect YouTube"
      if (import.meta.env.DEV) {
        console.error("YouTube OAuth callback failed:", err)
      }
      return { connected: false, error: message }
    }
  }, [])

  return { startOAuthFlow, handleOAuthCallback }
}
