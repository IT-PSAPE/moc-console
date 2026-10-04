import type { Broadcast, BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"
import type { MocTransport } from "./transport"

export type BroadcastDraftItem = {
  id: string | null
  title: string
  sortOrder: number
  storageBucket: string
  storagePath: string
  publicUrl: string
  mimeType: string
  fileSizeBytes: number
  durationSeconds: number | null
  createdAt: string | null
}

export type BroadcastPlaylistInput = {
  id: string
  workspaceId: string
  expectedUpdatedAt: string
  title: string
  description: string
  kind: BroadcastKind
  items: BroadcastDraftItem[]
}

export type BroadcastChange = { revision: string; type: "changed" | "deleted" | "reset" }
export type BroadcastSubscription = (change: BroadcastChange) => void

export function createBroadcastsClient(transport: MocTransport) {
  function call<T>(operation: string, input?: unknown, workspaceId?: string): Promise<T> {
    return transport.call<T>("broadcasts", operation, input, workspaceId)
  }

  function subscribe(broadcastId: string, onChange: BroadcastSubscription, after?: string): () => void {
    const query = after ? `?after=${encodeURIComponent(after)}` : ""
    const source = new EventSource(transport.url(`/api/public/broadcasts/${encodeURIComponent(broadcastId)}/events${query}`), { withCredentials: true })

    function receive(event: MessageEvent<string>) {
      try {
        const value = JSON.parse(event.data) as { revision?: unknown; type?: unknown }
        if (typeof value.revision !== "string" || (value.type !== "changed" && value.type !== "deleted" && value.type !== "reset")) return
        onChange({ revision: value.revision, type: value.type })
      } catch {
        // Ignore malformed events and let the next revision or periodic read recover.
      }
    }

    source.addEventListener("changed", receive as EventListener)
    source.addEventListener("deleted", receive as EventListener)
    source.addEventListener("reset", receive as EventListener)
    return () => source.close()
  }

  return {
    list(workspaceId: string): Promise<Broadcast[]> {
      return call("list", { workspaceId }, workspaceId)
    },
    getById(id: string, workspaceId: string): Promise<Broadcast | null> {
      return call("getById", { id }, workspaceId)
    },
    getPublicBySlug(slug: string): Promise<Broadcast | null> {
      return call("getPublicBySlug", { slug })
    },
    getPublicById(id: string): Promise<Broadcast | null> {
      return call("getPublicById", { id })
    },
    create(input: { workspaceId: string; id: string; title: string; description: string; slug: string; kind: BroadcastKind; items: BroadcastDraftItem[] }): Promise<Broadcast> {
      return call("create", input, input.workspaceId)
    },
    update(input: BroadcastPlaylistInput): Promise<Broadcast> {
      return call("update", input, input.workspaceId)
    },
    delete(input: { id: string; workspaceId: string }): Promise<{ storagePaths: string[]; kind: BroadcastKind }> {
      return call("delete", input, input.workspaceId)
    },
    subscribe,
  }
}

export type BroadcastsClient = ReturnType<typeof createBroadcastsClient>
export type { Broadcast, BroadcastItem }
