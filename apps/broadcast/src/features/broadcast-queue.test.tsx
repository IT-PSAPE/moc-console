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

const playbackContext = {
  state: { activeItemId: "one" },
  actions: {
    selectItem() {
      return undefined
    },
  },
  meta: { broadcast: createBroadcast(["one"]) },
}

mock.module("react", () => ({ ...React, ...createMockReactModule() }))
mock.module("./broadcast-playback-provider", () => ({
  useBroadcastPlaybackContext() {
    return playbackContext
  },
}))

const { BroadcastQueue } = await import("./broadcast-queue")

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

describe("BroadcastQueue", () => {
  beforeEach(() => {
    playbackContext.state.activeItemId = "one"
    globalThis.document = {
      querySelector() {
        return null
      },
    } as unknown as Document
  })

  test("pluralizes the queue count label", () => {
    playbackContext.meta.broadcast = createBroadcast(["one"])
    expect(collectText(new HookRuntime(BroadcastQueue).render({}))).toContain("1 item")

    playbackContext.meta.broadcast = createBroadcast(["one", "two"])
    expect(collectText(new HookRuntime(BroadcastQueue).render({}))).toContain("2 items")
  })

  test("scrolls the active queue item into view when it changes", () => {
    const scrollCalls: ScrollIntoViewOptions[] = []
    globalThis.document = {
      querySelector() {
        return {
          scrollIntoView(options?: ScrollIntoViewOptions) {
            scrollCalls.push(options ?? {})
          },
        }
      },
    } as unknown as Document
    playbackContext.meta.broadcast = createBroadcast(["one", "two"])

    new HookRuntime(BroadcastQueue).render({})

    expect(scrollCalls).toEqual([{ behavior: "smooth", block: "nearest", inline: "nearest" }])
  })
})
