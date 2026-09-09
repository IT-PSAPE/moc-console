import { getSupabaseAdmin } from "../supabase-admin.js"
import type { NotifyDestination } from "./dispatch.js"
import { enqueueOutboxEvent, processOutboxEvent, type OutboxRunResult } from "./outbox.js"

/**
 * Raised when the entity could not be stamped as notified. Callers decide what
 * that means: a user-triggered request answers 503 so the console can retry,
 * while the sync cron counts it and moves on.
 */
export class NotificationStateError extends Error {
  constructor(cause: unknown) {
    super("Notification state update failed", { cause })
    this.name = "NotificationStateError"
  }
}

type CreatedAnnouncement = {
  entityId: string
  entityType: "stream" | "meeting"
  eventType: "stream.created" | "meeting.created"
  payload: Record<string, unknown>
  table: "streams" | "zoom_meetings"
  workspaceId: string
}

export type StreamCreatedAnnouncement = {
  destinations?: readonly NotifyDestination[]
  scheduledStartTime: string | null
  streamId: string
  streamUrl: string | null
  title: string
  workspaceId: string
}

export type MeetingCreatedAnnouncement = {
  destinations?: readonly NotifyDestination[]
  joinUrl: string | null
  meetingId: string
  startTime: string | null
  topic: string
  workspaceId: string
}

/**
 * Enqueue, stamp, then dispatch — in that order, and always against the durable
 * event key the insert trigger already uses, so the enqueue merges with the
 * trigger's row instead of double-announcing. The row must exist before
 * dispatch: the outbox re-reads the entity by id when it renders the message.
 *
 * `notified_at` is only stamped where it is still null, which is what stops a
 * later sweep from re-announcing the same item.
 */
async function announceCreatedEntity({ entityId, entityType, eventType, payload, table, workspaceId }: CreatedAnnouncement): Promise<OutboxRunResult> {
  const eventKey = `${eventType}:${entityId}`
  await enqueueOutboxEvent({ workspaceId, eventType, entityType, entityId, eventKey, payload })

  const { error } = await getSupabaseAdmin()
    .from(table)
    .update({ notified_at: new Date().toISOString() })
    .eq("id", entityId)
    .is("notified_at", null)
  if (error) throw new NotificationStateError(error)

  return processOutboxEvent(eventKey)
}

export function announceStreamCreated({ destinations, scheduledStartTime, streamId, streamUrl, title, workspaceId }: StreamCreatedAnnouncement): Promise<OutboxRunResult> {
  return announceCreatedEntity({
    entityId: streamId,
    entityType: "stream",
    eventType: "stream.created",
    payload: { title, scheduledStartTime, streamUrl, ...(destinations ? { destinations } : {}) },
    table: "streams",
    workspaceId,
  })
}

export function announceMeetingCreated({ destinations, joinUrl, meetingId, startTime, topic, workspaceId }: MeetingCreatedAnnouncement): Promise<OutboxRunResult> {
  return announceCreatedEntity({
    entityId: meetingId,
    entityType: "meeting",
    eventType: "meeting.created",
    payload: { topic, startTime, joinUrl, ...(destinations ? { destinations } : {}) },
    table: "zoom_meetings",
    workspaceId,
  })
}
