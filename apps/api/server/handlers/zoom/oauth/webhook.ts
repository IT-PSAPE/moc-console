import { deleteZoomIntegrationsForUser } from "../../../integration-oauth-store.js"
import type { ApiRequest, ApiResponse } from "../../../http.js"
import {
  verifyZoomWebhook,
  zoomDeauthorizedUserId,
  zoomValidationEncryptedToken,
  zoomValidationPlainToken,
} from "../../../zoom-webhook.js"

export type ZoomWebhookDependencies = {
  deleteIntegrationsForUser: (zoomUserId: string) => Promise<void>
}

const productionDependencies: ZoomWebhookDependencies = {
  deleteIntegrationsForUser: deleteZoomIntegrationsForUser,
}

export async function handleZoomWebhook(
  request: ApiRequest,
  response: ApiResponse,
  dependencies: ZoomWebhookDependencies = productionDependencies,
): Promise<void> {
  response.setHeader("Content-Type", "application/json")
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const secret = process.env.ZOOM_SECRET_TOKEN
  if (!secret || !verifyZoomWebhook(request, secret)) {
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  const plainToken = zoomValidationPlainToken(request.body)
  if (plainToken) {
    response.status(200).json({ plainToken, encryptedToken: zoomValidationEncryptedToken(secret, plainToken) })
    return
  }

  const zoomUserId = zoomDeauthorizedUserId(request.body)
  if (zoomUserId) {
    await dependencies.deleteIntegrationsForUser(zoomUserId)
    response.status(200).json({ ok: true })
    return
  }

  response.status(200).json({ ok: true })
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await handleZoomWebhook(request, response)
}
