import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import type { ChangeEvent } from "react"
import * as React from "react"
import { beforeEach, describe, expect, mock, test } from "bun:test"
import { HookRuntime, createMockReactModule } from "./test-hook-runtime"

mock.module("react", () => ({ ...React, ...createMockReactModule() }))

const { useBroadcastPlayback } = await import("./use-broadcast-playback")

type FakeMediaElement = {
  currentTime: number
  loadCalls: number
  muted: boolean
  pauseCalls: number
  playCalls: number
  playError: Error | null
  volume: number
  load: () => void
  pause: () => void
  play: () => Promise<void>
}

function createItem(id: string, overrides: Partial<BroadcastItem> = {}): BroadcastItem {
  return {
    id,
    broadcastId: overrides.broadcastId ?? "broadcast-id",
    title: overrides.title ?? id,
    sortOrder: overrides.sortOrder ?? 0,
    storageBucket: "broadcasts",
    storagePath: `${id}.mp3`,
    publicUrl: overrides.publicUrl ?? `https://example.com/${id}.mp3`,
    mimeType: "audio/mpeg",
    fileSizeBytes: 1,
    durationSeconds: null,
    createdAt: "2026-09-04T00:00:00.000Z",
    ...overrides,
  }
}

function createBroadcast(id: string, itemIds: string[]): Broadcast {
  return {
    id,
    workspaceId: "workspace-id",
    createdBy: "user-id",
    title: `Broadcast ${id}`,
    description: "",
    slug: id,
    kind: "audio",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    items: itemIds.map((itemId, index) => createItem(itemId, { broadcastId: id, sortOrder: index })),
  }
}

function createMediaElement(): FakeMediaElement {
  return {
    currentTime: 0,
    loadCalls: 0,
    muted: false,
    pauseCalls: 0,
    playCalls: 0,
    playError: null,
    volume: 1,
    load() {
      this.loadCalls += 1
    },
    pause() {
      this.pauseCalls += 1
    },
    async play() {
      this.playCalls += 1
      if (this.playError) {
        throw this.playError
      }
    },
  }
}

function createDocumentStub() {
  const listeners = new Map<string, Set<() => void>>()

  return {
    addEventListener(eventName: string, listener: () => void) {
      const currentListeners = listeners.get(eventName) ?? new Set<() => void>()
      currentListeners.add(listener)
      listeners.set(eventName, currentListeners)
    },
    removeEventListener(eventName: string, listener: () => void) {
      listeners.get(eventName)?.delete(listener)
    },
    dispatch(eventName: string) {
      for (const listener of listeners.get(eventName) ?? []) {
        listener()
      }
    },
    exitFullscreen() {
      return Promise.resolve()
    },
    fullscreenElement: null as Element | null,
  }
}

function createRuntime(initialBroadcast: Broadcast) {
  return new HookRuntime(useBroadcastPlayback, initialBroadcast)
}

async function flushAsync() {
  await Promise.resolve()
  await Promise.resolve()
}

describe("useBroadcastPlayback", () => {
  beforeEach(() => {
    globalThis.document = createDocumentStub() as unknown as Document
  })

  test("restarts the only queued item when moving to previous during playback", async () => {
    const broadcast = createBroadcast("alpha", ["one"])
    const runtime = createRuntime(broadcast)
    runtime.render(broadcast)

    const firstElement = createMediaElement()
    const secondElement = createMediaElement()
    runtime.result?.actions.setFirstMediaElement(firstElement as unknown as HTMLMediaElement)
    runtime.result?.actions.setSecondMediaElement(secondElement as unknown as HTMLMediaElement)
    runtime.rerender()

    runtime.result?.actions.togglePlayback()
    runtime.rerender()
    await flushAsync()
    runtime.rerender()

    const initialPlayCalls = firstElement.playCalls
    firstElement.currentTime = 18

    runtime.result?.actions.moveToPrevious()
    runtime.rerender()
    await flushAsync()
    runtime.rerender()

    expect(runtime.result?.state.isPlaying).toBe(true)
    expect(firstElement.currentTime).toBe(0)
    expect(firstElement.playCalls).toBe(initialPlayCalls + 1)
  })

  test("restores the last non-zero volume when unmuting from zero", () => {
    const broadcast = createBroadcast("alpha", ["one"])
    const runtime = createRuntime(broadcast)
    runtime.render(broadcast)

    runtime.result?.actions.changeVolume({ currentTarget: { value: "0.35" } } as unknown as ChangeEvent<HTMLInputElement>)
    runtime.rerender()
    runtime.result?.actions.changeVolume({ currentTarget: { value: "0" } } as unknown as ChangeEvent<HTMLInputElement>)
    runtime.rerender()

    runtime.result?.actions.toggleMuted()
    runtime.rerender()

    expect(runtime.result?.state.isMuted).toBe(false)
    expect(runtime.result?.state.volume).toBe(0.35)
  })

  test("surfaces a media error and clears the playing state", async () => {
    const broadcast = createBroadcast("alpha", ["one"])
    const runtime = createRuntime(broadcast)
    runtime.render(broadcast)

    const firstElement = createMediaElement()
    runtime.result?.actions.setFirstMediaElement(firstElement as unknown as HTMLMediaElement)
    runtime.rerender()

    runtime.result?.actions.togglePlayback()
    runtime.rerender()
    await flushAsync()
    runtime.rerender()

    const handleMediaError = (runtime.result?.actions as { handleMediaError?: () => void } | undefined)?.handleMediaError
    expect(handleMediaError).toBeFunction()
    handleMediaError?.()
    runtime.rerender()

    expect(runtime.result?.state.isPlaying).toBe(false)
    expect(runtime.result?.state.playbackError).toBe("This media could not be played.")
  })

  test("clears the finished item when a live update leaves the queue empty", () => {
    const broadcast = createBroadcast("alpha", ["one"])
    const runtime = createRuntime(broadcast)
    runtime.render(broadcast)

    runtime.render({ ...broadcast, items: [] })
    runtime.result?.actions.moveToNext()
    runtime.rerender()

    expect(runtime.result?.state.activeItem).toBeNull()
    expect(runtime.result?.state.isPlaying).toBe(false)
  })
})
