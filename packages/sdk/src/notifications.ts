import type { NotifyDestination } from "@moc/types"
import type { MocTransport } from "./transport"

export type NotificationDispatchResult = {
  ok: boolean
  attempted: number
  dispatched: number
  failed: number
  pendingRetry: number
}

export type NotificationEntityType = "request" | "booking" | "venue_booking"

type AssignmentBody =
  | { kind: "request"; parentId: string; userId: string; duty: string }
  | { kind: "checklist_item"; parentId: string; userId: string }

export type NotificationsClient = {
  streamCreated(streamId: string, destinations?: NotifyDestination[]): Promise<NotificationDispatchResult>
  meetingCreated(meetingId: string, destinations?: NotifyDestination[]): Promise<NotificationDispatchResult>
  entityChanged(entityType: NotificationEntityType, entityId: string): Promise<NotificationDispatchResult>
  streamUpdated(streamId: string): Promise<NotificationDispatchResult>
  meetingUpdated(meetingId: string): Promise<NotificationDispatchResult>
  requestAssignment(requestId: string, userId: string, duty: string): Promise<unknown>
  checklistItemAssignment(checklistItemId: string, userId: string): Promise<unknown>
}

export function createNotificationsClient(transport: MocTransport): NotificationsClient {
  function postDispatch(path: string, input: Record<string, unknown>): Promise<NotificationDispatchResult> {
    return transport.request<NotificationDispatchResult>(path, { method: "POST", json: input })
  }

  function postAssignment(input: AssignmentBody): Promise<unknown> {
    return transport.request("/api/notifications/assignment", { method: "POST", json: input })
  }

  return {
    streamCreated(streamId, destinations) {
      return postDispatch("/api/notifications/internal/stream-created", {
        streamId,
        ...(destinations?.length ? { destinations } : {}),
      })
    },
    meetingCreated(meetingId, destinations) {
      return postDispatch("/api/notifications/internal/meeting-created", {
        meetingId,
        ...(destinations?.length ? { destinations } : {}),
      })
    },
    entityChanged(entityType, entityId) {
      return postDispatch("/api/notifications/internal/entity-changed", { entityType, entityId })
    },
    streamUpdated(streamId) {
      return postDispatch("/api/notifications/internal/stream-updated", { streamId })
    },
    meetingUpdated(meetingId) {
      return postDispatch("/api/notifications/internal/meeting-updated", { meetingId })
    },
    requestAssignment(requestId, userId, duty) {
      return postAssignment({ kind: "request", parentId: requestId, userId, duty })
    },
    checklistItemAssignment(checklistItemId, userId) {
      return postAssignment({ kind: "checklist_item", parentId: checklistItemId, userId })
    },
  }
}
