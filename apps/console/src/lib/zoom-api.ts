import { buildSessionHeaders } from "./api-auth"
import { apiUrl } from "@moc/utils/api-url"
import { getCurrentWorkspaceId } from "@/data/current-workspace"

/** Make an authenticated Zoom API call through the server-side token proxy. */
export async function zoomApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const [sessionHeaders, workspaceId] = await Promise.all([buildSessionHeaders(), getCurrentWorkspaceId()])

  return fetch(apiUrl(`/api/zoom/v2${path}`), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-MOC-Workspace": workspaceId,
      ...sessionHeaders,
      ...options.headers,
    },
  })
}

/** Revoke Zoom OAuth token. */
export async function revokeZoomToken(workspaceId: string): Promise<void> {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch(apiUrl("/api/zoom/oauth/revoke"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders,
    },
    body: JSON.stringify({ workspaceId }),
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    const data = contentType.includes("application/json") ? await response.json() as { error?: string } : null
    throw new Error(data?.error ?? "Zoom token revoke failed")
  }
}
