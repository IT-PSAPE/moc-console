import type { NotifyDestination } from "./dispatch.js"

const MAX_DESTINATIONS = 50
const MAX_GROUP_CHAT_ID_LENGTH = 64

export class DestinationInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DestinationInputError"
  }
}

/**
 * Validates a browser-supplied notification override before it reaches the
 * durable outbox. Registered groups and topics are checked again at dispatch
 * time; this only rejects malformed input that cannot be a destination.
 */
export function parseNotificationDestinations(value: unknown): NotifyDestination[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) throw new DestinationInputError("destinations must be an array")
  if (value.length === 0) return undefined
  if (value.length > MAX_DESTINATIONS) {
    throw new DestinationInputError(`destinations cannot contain more than ${MAX_DESTINATIONS} entries`)
  }

  const parsed: NotifyDestination[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new DestinationInputError("Each destination must be an object")
    }
    const { groupChatId, threadId } = entry as Record<string, unknown>
    if (typeof groupChatId !== "string" || !groupChatId.trim() || groupChatId.length > MAX_GROUP_CHAT_ID_LENGTH) {
      throw new DestinationInputError("Each destination must include a groupChatId")
    }
    if (threadId !== null && (typeof threadId !== "number" || !Number.isSafeInteger(threadId) || threadId < 1)) {
      throw new DestinationInputError("Each destination threadId must be null or a positive integer")
    }

    const destination = { groupChatId, threadId: threadId as number | null }
    const key = `${destination.groupChatId}:${destination.threadId ?? "main"}`
    if (!seen.has(key)) {
      seen.add(key)
      parsed.push(destination)
    }
  }

  return parsed
}
