import { supabase } from "@moc/data/supabase"
import { BROADCAST_MEDIA_BUCKET } from "@moc/types/broadcast/broadcast-constants"
import type { Broadcast, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { fetchBroadcastById } from "./fetch-broadcasts"
import { createBroadcastSlug } from "./broadcast-slug"

export type CreateBroadcastParams = {
  workspaceId: string
  title: string
  description: string
  kind: BroadcastKind
  isPublished: boolean
  loopEnabled: boolean
  preloadCount: number
  files: File[]
}

function sanitizeFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-")
}

async function getDurationSeconds(file: File, kind: BroadcastKind): Promise<number | null> {
  if (typeof document === "undefined") {
    return null
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const duration = await new Promise<number | null>((resolve) => {
      const media = document.createElement(kind)

      function handleLoadedMetadata() {
        cleanup()
        resolve(Number.isFinite(media.duration) ? media.duration : null)
      }

      function handleError() {
        cleanup()
        resolve(null)
      }

      function cleanup() {
        media.removeEventListener("loadedmetadata", handleLoadedMetadata)
        media.removeEventListener("error", handleError)
      }

      media.preload = "metadata"
      media.addEventListener("loadedmetadata", handleLoadedMetadata)
      media.addEventListener("error", handleError)
      media.src = objectUrl
    })

    return duration
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function createBroadcast(params: CreateBroadcastParams): Promise<Broadcast> {
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(authError.message)
  }

  const userId = authData.user?.id

  if (!userId) {
    throw new Error("You must be signed in to create a broadcast")
  }

  const slug = createBroadcastSlug(params.title)
  const { data: created, error: createError } = await supabase
    .from("broadcasts")
    .insert({
      workspace_id: params.workspaceId,
      created_by: userId,
      title: params.title,
      description: params.description,
      slug,
      kind: params.kind,
      is_published: params.isPublished,
      loop_enabled: params.loopEnabled,
      preload_count: params.preloadCount,
    })
    .select("id")
    .single()

  if (createError) {
    throw new Error(createError.message)
  }

  const broadcastId = String(created.id)
  const itemRows = await Promise.all(
    params.files.map(async (file, index) => {
      const storagePath = `${params.workspaceId}/${broadcastId}/${index + 1}-${sanitizeFileName(file.name)}`
      const uploadResult = await supabase.storage.from(BROADCAST_MEDIA_BUCKET).upload(storagePath, file, { upsert: false })

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message)
      }

      const publicUrl = supabase.storage.from(BROADCAST_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl
      const durationSeconds = await getDurationSeconds(file, params.kind)

      return {
        broadcast_id: broadcastId,
        title: file.name,
        sort_order: index,
        storage_bucket: BROADCAST_MEDIA_BUCKET,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: file.type || `${params.kind}/unknown`,
        file_size_bytes: file.size,
        duration_seconds: durationSeconds,
      }
    }),
  )

  const { error: itemsError } = await supabase.from("broadcast_items").insert(itemRows)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const broadcast = await fetchBroadcastById(broadcastId, params.workspaceId)

  if (!broadcast) {
    throw new Error("The broadcast was created but could not be reloaded")
  }

  return broadcast
}
