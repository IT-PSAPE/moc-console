import type { ScheduledSnapshot } from '@moc/notifications'
import type { MocTransport } from './transport'

export function createTelegramClient(transport: MocTransport) {
  return {
    scheduledMessages(workspaceId: string): Promise<ScheduledSnapshot> {
      return transport.call('telegram', 'scheduled.snapshot', {}, workspaceId)
    },
    mutateScheduledMessage(workspaceId: string, op: string, data: unknown): Promise<ScheduledSnapshot> {
      return transport.call('telegram', 'scheduled.mutate', { op, data }, workspaceId)
    },
  }
}

export type TelegramClient = ReturnType<typeof createTelegramClient>
