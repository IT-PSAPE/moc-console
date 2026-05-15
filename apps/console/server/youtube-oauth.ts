const TOKEN_URL = "https://oauth2.googleapis.com/token"
const REVOKE_URL = "https://oauth2.googleapis.com/revoke"
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"

export type YouTubeOAuthConfig = {
  clientId: string
  clientSecret: string
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

type ChannelInfo = {
  channelId: string
  channelTitle: string
}

type ExchangeResponse = TokenResponse & {
  channel: ChannelInfo
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const data = await response.json() as { error?: string; error_description?: string; message?: string }
    return data.error_description ?? data.error ?? data.message ?? fallback
  }
  const text = await response.text()
  return text || fallback
}

async function fetchYouTubeChannel(accessToken: string): Promise<ChannelInfo> {
  const response = await fetch(CHANNELS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch YouTube channel"))
  }
  const data = await response.json()
  const channel = data.items?.[0]
  if (!channel) {
    throw new Error("No YouTube channel was found for this Google account. Create a YouTube channel first, then try again.")
  }
  return { channelId: channel.id as string, channelTitle: channel.snippet.title as string }
}

export function resolveYouTubeOAuthConfig(env: Record<string, string | undefined>): YouTubeOAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID ?? env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth environment variables")
  }

  return { clientId, clientSecret }
}

export async function exchangeYouTubeCode(
  config: YouTubeOAuthConfig,
  code: string,
  redirectUri: string,
): Promise<ExchangeResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "YouTube token exchange failed"))
  }

  const tokens = await response.json() as TokenResponse
  const channel = await fetchYouTubeChannel(tokens.access_token)
  return { ...tokens, channel }
}

export async function refreshYouTubeToken(
  config: YouTubeOAuthConfig,
  refreshToken: string,
): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "YouTube token refresh failed"))
  }

  return response.json() as Promise<TokenResponse>
}

export async function revokeYouTubeToken(token: string): Promise<void> {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}
