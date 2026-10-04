import { moc } from "../lib/moc-client"
import { getCurrentWorkspaceId } from "./current-workspace"

export type ThumbnailSource =
  | { blob: Blob; origin: "file" | "url"; sourceUrl: string | null }
  | null

export async function uploadStreamThumbnail(blob: Blob): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId()
  const result = await moc.storage.upload({ purpose: "stream-thumbnail", workspaceId, file: blob })
  return result.url
}

export function describeThumbnailFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  if (/unauthoriz|forbidden|403|not.*verif|ineligible/i.test(raw)) {
    return "YouTube rejected the thumbnail — your channel may not be verified for custom thumbnails. The stream was created without it."
  }
  return "YouTube rejected the thumbnail, so the stream was created without it."
}
