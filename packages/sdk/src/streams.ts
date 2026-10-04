import type { Stream, StreamPreset, YouTubeConnection } from "@moc/types/streams/stream"
import type { ZoomConnection, ZoomMeeting } from "@moc/types/streams/zoom"
import type { MocTransport } from "./transport"

export type StreamRecord = Record<string, unknown>

export function createStreamsClient(transport: MocTransport) {
  return {
    listStreams(workspaceId?: string) {
      return transport.call<Stream[]>("streams", "list", {}, workspaceId)
    },
    getStream(id: string, workspaceId?: string) {
      return transport.call<Stream | null>("streams", "get", { id }, workspaceId)
    },
    listZoomMeetings(workspaceId?: string) {
      return transport.call<ZoomMeeting[]>("streams", "listZoomMeetings", {}, workspaceId)
    },
    getZoomMeeting(id: string, workspaceId?: string) {
      return transport.call<ZoomMeeting | null>("streams", "getZoomMeeting", { id }, workspaceId)
    },
    getYouTubeConnection(workspaceId?: string) {
      return transport.call<YouTubeConnection | null>("streams", "getYouTubeConnection", {}, workspaceId)
    },
    getZoomConnection(workspaceId?: string) {
      return transport.call<ZoomConnection | null>("streams", "getZoomConnection", {}, workspaceId)
    },
    insertStream(record: StreamRecord, workspaceId?: string) {
      return transport.call<void>("streams", "insertStream", { record }, workspaceId)
    },
    updateStream(id: string, record: StreamRecord, workspaceId?: string) {
      return transport.call<void>("streams", "updateStream", { id, record }, workspaceId)
    },
    deleteStream(id: string, workspaceId?: string) {
      return transport.call<void>("streams", "deleteStream", { id }, workspaceId)
    },
    upsertStreams(records: StreamRecord[], workspaceId?: string) {
      return transport.call<void>("streams", "upsertStreams", { records }, workspaceId)
    },
    deleteStreamsByBroadcastIds(ids: string[], workspaceId?: string) {
      return transport.call<void>("streams", "deleteStreamsByBroadcastIds", { ids }, workspaceId)
    },
    updateYouTubePresets(presets: StreamPreset, workspaceId?: string) {
      return transport.call<void>("streams", "updateYouTubePresets", { presets }, workspaceId)
    },
    insertZoomMeeting(record: StreamRecord, workspaceId?: string) {
      return transport.call<void>("streams", "insertZoomMeeting", { record }, workspaceId)
    },
    updateZoomMeeting(id: string, record: StreamRecord, workspaceId?: string) {
      return transport.call<void>("streams", "updateZoomMeeting", { id, record }, workspaceId)
    },
    deleteZoomMeeting(id: string, workspaceId?: string) {
      return transport.call<void>("streams", "deleteZoomMeeting", { id }, workspaceId)
    },
    upsertZoomMeetings(records: StreamRecord[], workspaceId?: string) {
      return transport.call<void>("streams", "upsertZoomMeetings", { records }, workspaceId)
    },
    deleteZoomMeetingsByIds(ids: string[], workspaceId?: string) {
      return transport.call<void>("streams", "deleteZoomMeetingsByIds", { ids }, workspaceId)
    },
  }
}
