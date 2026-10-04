import type { ScheduledSnapshot } from '@moc/notifications'
import { moc } from '@/lib/moc-client'

export function fetchScheduledMessages(workspaceId: string): Promise<ScheduledSnapshot> {
  return moc.telegram.scheduledMessages(workspaceId)
}

export function mutateScheduledMessage(workspaceId: string, op: string, data: unknown): Promise<ScheduledSnapshot> {
  return moc.telegram.mutateScheduledMessage(workspaceId, op, data)
}
