import { buildSessionHeaders } from "./api-auth"
import { apiUrl } from "@moc/utils/api-url"

async function getZoomErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const data = await response.json() as { error?: string }
    return data.error ?? fallback
  }

  const text = await response.text()
  return text || fallback
}

export async function exchangeZoomCodeForTokens(code: string, redirectUri: string, workspaceId: string): Promise<void> {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch(apiUrl("/api/zoom/oauth/exchange"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders,
    },
    body: JSON.stringify({ code, redirectUri, workspaceId }),
  })

  if (!response.ok) {
    throw new Error(await getZoomErrorMessage(response, "Zoom token exchange failed"))
  }
}
