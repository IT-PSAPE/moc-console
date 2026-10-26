export type ItemKind = "request" | "equipment" | "booking" | "venue-booking" | "checklist" | "stream" | "meeting" | "broadcast" | "scheduled-message"

export type DiscussionActor = {
  id: string | null
  name: string
  avatarUrl: string | null
  kind: "member" | "requester" | "integration" | "system" | "unknown"
}

export type ActivityChange = { field: string; before: unknown; after: unknown }

export type ItemActivity = {
  id: string
  itemKind: ItemKind
  itemId: string
  type: string
  changes: ActivityChange[]
  details: Record<string, unknown>
  actor: DiscussionActor
  operationId: string | null
  createdAt: string
}

export type ItemComment = {
  id: string
  itemKind: ItemKind
  itemId: string
  body: string
  actor: DiscussionActor
  origin: string
  createdAt: string
}

export type DiscussionPage<T> = { items: T[]; nextCursor: string | null }
