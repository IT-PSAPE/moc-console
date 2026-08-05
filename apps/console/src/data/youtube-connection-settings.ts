import type { StreamPreset } from "@moc/types/streams/stream"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { revokeToken } from "@/lib/youtube-client"

export async function saveStreamPreset(preset: StreamPreset): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()
  const { error } = await supabase
    .from("youtube_connections")
    .update({ presets: preset })
    .eq("workspace_id", workspaceId)
  if (error) throw new Error(error.message)
}

export async function disconnectYouTube(): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()
  await revokeToken(workspaceId)
}
