import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import type { ReactNode } from "react"
import * as React from "react"
import { beforeEach, describe, expect, mock, test } from "bun:test"
import { HookRuntime, createMockReactModule } from "./test-hook-runtime"

function createItem(id: string, sortOrder: number): BroadcastItem {
  return {
    id,
    broadcastId: "broadcast-id",
    title: id,
    sortOrder,
    storageBucket: "broadcasts",
    storagePath: `${id}.mp3`,
    publicUrl: `https://example.com/${id}.mp3`,
    mimeType: "audio/mpeg",
    fileSizeBytes: 1,
    durationSeconds: null,
    createdAt: "2026-09-04T00:00:00.000Z",
  }
}

function createBroadcast(itemIds: string[]): Broadcast {
  return {
    id: "broadcast-id",
    workspaceId: "workspace-id",
    createdBy: "user-id",
    title: "Broadcast",
    description: "",
    slug: "broadcast",
    kind: "audio",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    items: itemIds.map(createItem),
  }
}

function createMetadata(broadcast: Broadcast) {
  return new Map(broadcast.items.map((item) => [item.id, { artist: "Someone", coverUrl: null, title: item.title }]))
}

const playbackContext = {
  state: { activeItemId: "one" },
  actions: {
    selectItem() {
      return undefined
    },
  },
  meta: { broadcast: createBroadcast(["one"]), metadata: createMetadata(createBroadcast(["one"])) },
}

function useBroadcast(itemIds: string[]) {
  const broadcast = createBroadcast(itemIds)
  playbackContext.meta.broadcast = broadcast
  playbackContext.meta.metadata = createMetadata(broadcast)
  return broadcast
}

mock.module("react", () => ({ ...React, ...createMockReactModule() }))
mock.module("./broadcast-playback-provider", () => ({
  useBroadcastPlaybackContext() {
    return playbackContext
  },
}))

const { BroadcastQueue } = await import("./broadcast-queue")
const { BroadcastQueueItem } = await import("./broadcast-queue-item")

function collectText(node: ReactNode, values: string[] = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, values)
    return values
  }

  if (typeof node === "string") {
    values.push(node)
    return values
  }

  if (!node || typeof node !== "object" || !("props" in node)) return values

  collectText((node as { props: { children?: ReactNode } }).props.children, values)
  return values
}

type QueueRowProps = { display: { title: string }; isActive: boolean }

function collectRows(node: ReactNode, rows: QueueRowProps[] = []): QueueRowProps[] {
  if (Array.isArray(node)) {
    for (const child of node) collectRows(child, rows)
    return rows
  }

  if (!node || typeof node !== "object" || !("props" in node) || !("type" in node)) return rows

  const element = node as { props: Record<string, unknown>; type: unknown }

  if (element.type === BroadcastQueueItem) rows.push(element.props as unknown as QueueRowProps)

  collectRows(element.props.children as ReactNode, rows)
  return rows
}

describe("BroadcastQueue", () => {
  beforeEach(() => {
    playbackContext.state.activeItemId = "one"
  })

  test("pluralizes the queue count label", () => {
    useBroadcast(["one"])
    expect(collectText(new HookRuntime(BroadcastQueue).render({}))).toContain("Playlist · 1 item")

    useBroadcast(["one", "two"])
    expect(collectText(new HookRuntime(BroadcastQueue).render({}))).toContain("Playlist · 2 items")
  })

  test("heads the list with Playlist and no other chrome", () => {
    useBroadcast(["one", "two"])

    const text = collectText(new HookRuntime(BroadcastQueue).render({})).join(" ")

    expect(text).toContain("Broadcast")
    expect(text).not.toContain("Now playing")
    expect(text).not.toContain("Item 2")
  })

  test("gives every row its resolved metadata and marks only the active one", () => {
    useBroadcast(["one", "two", "three"])

    const rows = collectRows(new HookRuntime(BroadcastQueue).render({}))

    expect(rows.map((row) => row.display.title)).toEqual(["one", "two", "three"])
    expect(rows.map((row) => row.isActive)).toEqual([true, false, false])
  })
})
