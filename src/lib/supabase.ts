import { createClient } from "@supabase/supabase-js"

const youtubeOAuthCodeKey = "youtube_oauth_code"
const youtubeOAuthErrorKey = "youtube_oauth_error"

function interceptYouTubeOAuthRedirect() {
  const params = new URLSearchParams(window.location.search)
  const hasYouTubeCode = params.has("code") && params.has("scope")
  const hasYouTubeError = params.has("error")

  if (!hasYouTubeCode && !hasYouTubeError) {
    return
  }

  if (hasYouTubeCode) {
    const code = params.get("code")
    if (code) {
      sessionStorage.setItem(youtubeOAuthCodeKey, code)
    }
    sessionStorage.removeItem(youtubeOAuthErrorKey)
  }

  if (hasYouTubeError) {
    const error = params.get("error")
    const description = params.get("error_description")
    const message = description ? `${error ?? "oauth_error"}: ${description}` : (error ?? "OAuth request was rejected")
    sessionStorage.setItem(youtubeOAuthErrorKey, message)
    sessionStorage.removeItem(youtubeOAuthCodeKey)
  }

  const cleanUrl = new URL(window.location.href)
  cleanUrl.searchParams.delete("code")
  cleanUrl.searchParams.delete("scope")
  cleanUrl.searchParams.delete("iss")
  cleanUrl.searchParams.delete("authuser")
  cleanUrl.searchParams.delete("prompt")
  cleanUrl.searchParams.delete("error")
  cleanUrl.searchParams.delete("error_description")
  window.history.replaceState({}, "", cleanUrl.toString())
}

// Intercept Google OAuth redirects before Supabase tries to exchange the code as PKCE.
// Google includes `scope`, `authuser`, and `prompt` alongside the YouTube OAuth code.
interceptYouTubeOAuthRedirect()

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseKey)
