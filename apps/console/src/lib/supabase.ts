import { createClient } from "@supabase/supabase-js"

const youtubeOAuthCodeKey = "youtube_oauth_code"
const youtubeOAuthErrorKey = "youtube_oauth_error"
const youtubeOAuthStateKey = "youtube_oauth_state"

function interceptYouTubeOAuthRedirect() {
  const params = new URLSearchParams(window.location.search)
  const hasYouTubeCode = params.has("code") && params.has("scope")
  const hasYouTubeError = params.has("error")

  if (!hasYouTubeCode && !hasYouTubeError) {
    return
  }

  if (hasYouTubeCode) {
    const expectedState = sessionStorage.getItem(youtubeOAuthStateKey)
    const returnedState = params.get("state")
    sessionStorage.removeItem(youtubeOAuthStateKey)

    if (!expectedState || !returnedState || expectedState !== returnedState) {
      sessionStorage.setItem(youtubeOAuthErrorKey, "OAuth state mismatch — possible CSRF attempt. Please try again.")
      sessionStorage.removeItem(youtubeOAuthCodeKey)
    } else {
      const code = params.get("code")
      if (code) {
        sessionStorage.setItem(youtubeOAuthCodeKey, code)
      }
      sessionStorage.removeItem(youtubeOAuthErrorKey)
    }
  }

  if (hasYouTubeError) {
    sessionStorage.removeItem(youtubeOAuthStateKey)
    const error = params.get("error")
    const description = params.get("error_description")
    const message = description ? `${error ?? "oauth_error"}: ${description}` : (error ?? "OAuth request was rejected")
    sessionStorage.setItem(youtubeOAuthErrorKey, message)
    sessionStorage.removeItem(youtubeOAuthCodeKey)
  }

  const cleanUrl = new URL(window.location.href)
  cleanUrl.searchParams.delete("code")
  cleanUrl.searchParams.delete("scope")
  cleanUrl.searchParams.delete("state")
  cleanUrl.searchParams.delete("iss")
  cleanUrl.searchParams.delete("authuser")
  cleanUrl.searchParams.delete("prompt")
  cleanUrl.searchParams.delete("error")
  cleanUrl.searchParams.delete("error_description")
  window.history.replaceState({}, "", cleanUrl.toString())
}

const zoomOAuthCodeKey = "zoom_oauth_code"
const zoomOAuthErrorKey = "zoom_oauth_error"
const zoomOAuthPendingKey = "zoom_oauth_pending"
const zoomOAuthStateKey = "zoom_oauth_state"

function interceptZoomOAuthRedirect() {
  const params = new URLSearchParams(window.location.search)
  const isPending = sessionStorage.getItem(zoomOAuthPendingKey) === "true"

  if (!isPending) return

  const code = params.get("code")
  const error = params.get("error")

  if (!code && !error) return

  // Clear the pending flag
  sessionStorage.removeItem(zoomOAuthPendingKey)

  if (code) {
    const expectedState = sessionStorage.getItem(zoomOAuthStateKey)
    const returnedState = params.get("state")
    sessionStorage.removeItem(zoomOAuthStateKey)

    if (!expectedState || !returnedState || expectedState !== returnedState) {
      sessionStorage.setItem(zoomOAuthErrorKey, "OAuth state mismatch — possible CSRF attempt. Please try again.")
      sessionStorage.removeItem(zoomOAuthCodeKey)
    } else {
      sessionStorage.setItem(zoomOAuthCodeKey, code)
      sessionStorage.removeItem(zoomOAuthErrorKey)
    }
  }

  if (error) {
    sessionStorage.removeItem(zoomOAuthStateKey)
    const description = params.get("error_description")
    const message = description ? `${error}: ${description}` : (error ?? "Zoom OAuth was rejected")
    sessionStorage.setItem(zoomOAuthErrorKey, message)
    sessionStorage.removeItem(zoomOAuthCodeKey)
  }

  const cleanUrl = new URL(window.location.href)
  cleanUrl.searchParams.delete("code")
  cleanUrl.searchParams.delete("error")
  cleanUrl.searchParams.delete("error_description")
  cleanUrl.searchParams.delete("state")
  window.history.replaceState({}, "", cleanUrl.toString())
}

// Intercept OAuth redirects before Supabase tries to exchange the code as PKCE.
// Zoom: detected via a pending flag set before redirect.
// Google/YouTube: detected by the presence of `scope` param.
interceptZoomOAuthRedirect()
interceptYouTubeOAuthRedirect()

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseKey)
