import type { ScheduledSnapshot } from '@moc/notifications'
import type { MocTransport } from './transport'

export function createTelegramClient(transport: MocTransport) {
  return {
    scheduledMessages(workspaceId: string, view: 'active' | 'history' = 'active', cursor?: string): Promise<ScheduledSnapshot> {
      return transport.call('telegram', 'scheduled.snapshot', view === 'history' ? { view, cursor } : {}, workspaceId)
    },
    mutateScheduledMessage(workspaceId: string, op: string, data: unknown): Promise<ScheduledSnapshot> {
      return transport.call('telegram', 'scheduled.mutate', { op, data }, workspaceId)
    },
  }
}

export type TelegramClient = ReturnType<typeof createTelegramClient>
