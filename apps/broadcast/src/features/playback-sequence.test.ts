import type { BroadcastItem } from "@moc/types/broadcast/broadcast"
import { describe, expect, test } from "bun:test"
import {
  getMediaSourceKey,
  getNextPlaybackIndex,
  getNextPlaybackItem,
  getPreviousPlaybackIndex,
  getPreviousPlaybackItem,
} from "./playback-sequence"

function createItem(id: string, publicUrl = `https://example.com/${id}.mp3`): BroadcastItem {
  return {
    id,
    broadcastId: "broadcast-id",
    title: id,
    sortOrder: 0,
    storageBucket: "broadcasts",
    storagePath: `${id}.mp3`,
    publicUrl,
    mimeType: "audio/mpeg",
    fileSizeBytes: 1,
    durationSeconds: null,
    createdAt: "2026-09-03T00:00:00.000Z",
  }
}

describe("playback indices", () => {
  test("always wraps in both directions", () => {
    expect(getNextPlaybackIndex(3, 2)).toBe(0)
    expect(getPreviousPlaybackIndex(3, 0)).toBe(2)
  })

  test("returns no index for an empty queue", () => {
    expect(getNextPlaybackIndex(0, 0)).toBeNull()
    expect(getPreviousPlaybackIndex(0, 0)).toBeNull()
  })
})

describe("playlist changes", () => {
  const items = [createItem("one"), createItem("two"), createItem("three")]

  test("uses the latest queue order around the current item", () => {
    expect(getNextPlaybackItem(items, "two")?.id).toBe("three")
    expect(getPreviousPlaybackItem(items, "two")?.id).toBe("one")
  })

  test("starts from the queue edge when the playing item was removed", () => {
    expect(getNextPlaybackItem(items, "removed")?.id).toBe("one")
    expect(getPreviousPlaybackItem(items, "removed")?.id).toBe("three")
  })

  test("distinguishes a replaced media file that keeps its item id", () => {
    expect(getMediaSourceKey(createItem("one", "https://example.com/old.mp3"))).not.toBe(
      getMediaSourceKey(createItem("one", "https://example.com/new.mp3")),
    )
  })
})
