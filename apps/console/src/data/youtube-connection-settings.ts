import type { StreamPreset } from "@moc/types/streams/stream"
import { getCurrentWorkspaceId } from "./current-workspace"
import { revokeToken } from "@/lib/youtube-client"
import { moc } from "@/lib/moc-client"

export async function saveStreamPreset(preset: StreamPreset): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()
  await moc.streams.updateYouTubePresets(preset, workspaceId)
}

export async function disconnectYouTube(): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()
  await revokeToken(workspaceId)
}
