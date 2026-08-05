import { buildSessionHeaders } from "./api-auth"
import { apiUrl } from "@moc/utils/api-url"

async function getJsonError(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return fallback

  const data = await response.json() as { error?: string }
  return data.error ?? fallback
}

export async function exchangeCodeForTokens(code: string, redirectUri: string, workspaceId: string): Promise<void> {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch(apiUrl("/api/youtube/oauth/exchange"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ code, redirectUri, workspaceId }),
  })

  if (!response.ok) {
    throw new Error(await getJsonError(response, "YouTube token exchange failed"))
  }
}

export async function revokeToken(workspaceId: string): Promise<void> {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch(apiUrl("/api/youtube/oauth/revoke"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ workspaceId }),
  })

  if (!response.ok) {
    throw new Error(await getJsonError(response, "YouTube token revoke failed"))
  }
}
