import { buildSessionHeaders } from "./api-auth"
import { getValidAccessToken, getZoomErrorMessage } from "./zoom-auth"

/** Make an authenticated Zoom API call. Handles token refresh automatically. */
export async function zoomApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getValidAccessToken()
  const sessionHeaders = await buildSessionHeaders()
  const url = path.startsWith("http") ? path : `/api/zoom/v2${path}`

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...sessionHeaders,
      ...options.headers,
    },
  })
}

/** Revoke Zoom OAuth token. */
export async function revokeZoomToken(accessToken: string): Promise<void> {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/zoom/oauth/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders,
    },
    body: JSON.stringify({ token: accessToken }),
  })

  if (!response.ok) {
    throw new Error(await getZoomErrorMessage(response, "Zoom token revoke failed"))
  }
}
