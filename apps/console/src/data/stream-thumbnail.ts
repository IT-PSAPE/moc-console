import { supabase } from "@moc/data/supabase"
import { randomId } from "@moc/utils/random-id"
import { getCurrentWorkspaceId } from "./current-workspace"

export type ThumbnailSource =
  | { blob: Blob; origin: "file" | "url"; sourceUrl: string | null }
  | null

export async function uploadStreamThumbnail(blob: Blob): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId()
  const ext = blob.type === "image/png" ? "png" : "jpg"
  const path = `${workspaceId}/stream-thumbnails/${randomId()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type || "image/jpeg",
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from("media").getPublicUrl(path)
  return data.publicUrl
}

export function describeThumbnailFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  if (/unauthoriz|forbidden|403|not.*verif|ineligible/i.test(raw)) {
    return "YouTube rejected the thumbnail — your channel may not be verified for custom thumbnails. The stream was created without it."
  }
  return "YouTube rejected the thumbnail, so the stream was created without it."
}
