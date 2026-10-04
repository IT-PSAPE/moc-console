import type { ZoomConnection, ZoomMeeting } from "@moc/types/streams/zoom"
import { moc } from "@/lib/moc-client"
import { getCurrentWorkspaceId } from "./current-workspace"

export async function fetchZoomConnection(workspaceId?: string): Promise<ZoomConnection | null> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId()
  return moc.streams.getZoomConnection(resolvedWorkspaceId)
}

export async function fetchZoomConnectionId(workspaceId?: string): Promise<string> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId()
  const connection = await moc.streams.getZoomConnection(resolvedWorkspaceId)
  if (!connection) throw new Error("Zoom is not connected for this workspace")
  return connection.id
}

export async function fetchZoomMeetings(workspaceId?: string): Promise<ZoomMeeting[]> {
  return moc.streams.listZoomMeetings(workspaceId)
}

export async function fetchZoomMeetingById(id: string, workspaceId?: string): Promise<ZoomMeeting | undefined> {
  return await moc.streams.getZoomMeeting(id, workspaceId) ?? undefined
}
