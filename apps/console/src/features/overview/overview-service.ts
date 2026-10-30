import type { UpcomingScheduledMessage } from '@moc/sdk/overview'
import { moc } from '@/lib/moc-client'

export function fetchUpcomingMessages(workspaceId: string): Promise<UpcomingScheduledMessage[]> {
  return moc.overview.scheduledMessages(workspaceId)
}
