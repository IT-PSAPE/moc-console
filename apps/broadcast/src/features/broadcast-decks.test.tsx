import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, mock, test } from "bun:test"

let mediaErrorCalls = 0
let nextCalls = 0

const playbackContext = {
  state: {
    activeDeck: 0 as 0 | 1,
    activeItem: null as BroadcastItem | null,
    activeItemId: "",
    deckItems: [null, null] as [BroadcastItem | null, BroadcastItem | null],
    isFullscreen: false,
    isMuted: false,
    isPlaying: false,
    playbackError: null as string | null,
    volume: 1,
  },
  actions: {
    changeVolume() {
      return undefined
    },
    handleMediaError() {
      mediaErrorCalls += 1
    },
    moveToNext() {
      nextCalls += 1
    },
    moveToPrevious() {
      return undefined
    },
    selectItem() {
      return undefined
    },
    setFirstMediaElement() {
      return undefined
    },
    setPlayerRoot() {
      return undefined
    },
    setSecondMediaElement() {
      return undefined
    },
    toggleFullscreen() {
      return Promise.resolve()
    },
    toggleMuted() {
      return undefined
    },
    togglePlayback() {
      return undefined
    },
  },
  meta: { broadcast: null as unknown as Broadcast },
}

mock.module("./broadcast-playback-provider", () => ({
  useBroadcastPlaybackContext() {
    return playbackContext
  },
}))

const { BroadcastAudioDecks } = await import("./broadcast-audio-decks")
const { BroadcastVideoDecks } = await import("./broadcast-video-decks")

function createItem(id: string): BroadcastItem {
  return {
    id,
    broadcastId: "broadcast-id",
    title: id,
    sortOrder: 0,
    storageBucket: "broadcasts",
    storagePath: `${id}.mp3`,
    publicUrl: `https://example.com/${id}.mp3`,
    mimeType: "audio/mpeg",
    fileSizeBytes: 1,
    durationSeconds: null,
    createdAt: "2026-09-04T00:00:00.000Z",
  }
}

function collectElements(node: ReactNode, type: string, found: Array<{ props: Record<string, unknown> }> = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, type, found)
    return found
  }

  if (!node || typeof node !== "object" || !("props" in node) || !("type" in node)) return found

  const element = node as { props: Record<string, unknown>; type: unknown }
  if (element.type === type) found.push(element)

  collectElements(element.props.children as ReactNode, type, found)
  return found
}

describe("broadcast media decks", () => {
  beforeEach(() => {
    mediaErrorCalls = 0
    nextCalls = 0
    playbackContext.state.activeDeck = 0
    playbackContext.state.deckItems = [createItem("one"), createItem("two")]
  })

  test("renders one audio element per deck, each with its own source", () => {
    const elements = collectElements(BroadcastAudioDecks(), "audio")

    expect(elements).toHaveLength(2)
    expect(elements.map((element) => element.props.src)).toEqual([
      "https://example.com/one.mp3",
      "https://example.com/two.mp3",
    ])
  })

  test("renders one video element per deck and shows only the active one", () => {
    const elements = collectElements(BroadcastVideoDecks(), "video")

    expect(elements).toHaveLength(2)
    expect(elements[0]?.props["aria-hidden"]).toBe(false)
    expect(elements[1]?.props["aria-hidden"]).toBe(true)
  })

  test("ignores ended and error events from the deck that is not on air", () => {
    const elements = collectElements(BroadcastAudioDecks(), "audio")
    const idleEnded = elements[1]?.props.onEnded as (() => void) | undefined
    const idleError = elements[1]?.props.onError as (() => void) | undefined

    idleEnded?.()
    idleError?.()

    expect(nextCalls).toBe(0)
    expect(mediaErrorCalls).toBe(0)
  })

  test("advances and reports failures for the deck that is on air", () => {
    const elements = collectElements(BroadcastAudioDecks(), "audio")
    const activeEnded = elements[0]?.props.onEnded as (() => void) | undefined
    const activeError = elements[0]?.props.onError as (() => void) | undefined

    activeEnded?.()
    activeError?.()

    expect(nextCalls).toBe(1)
    expect(mediaErrorCalls).toBe(1)
  })
})
