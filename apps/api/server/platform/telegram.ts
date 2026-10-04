import type { PlatformOperation } from './context.js'
import { scheduledSnapshot, mutateScheduledMessages } from '../scheduled-messages/handler.js'

function inputRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request')
  return input as Record<string, unknown>
}

const scheduledSnapshotOperation: PlatformOperation = {
  permission: 'can_update',
  run: (context) => scheduledSnapshot(context.workspaceId,context.db,false),
}

const scheduledMutateOperation: PlatformOperation = {
  permission: 'can_update',
  async run(context, input) {
    await mutateScheduledMessages(context.userId, context.workspaceId, inputRecord(input),context.db)
    return scheduledSnapshot(context.workspaceId,context.db,false)
  },
}

export const operations: Record<string, PlatformOperation> = {
  'scheduled.snapshot': scheduledSnapshotOperation,
  'scheduled.mutate': scheduledMutateOperation,
}
