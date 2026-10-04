import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { HookRuntime, createMockReactModule } from "./test-hook-runtime"

type Deferred<T> = {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T) => void
}

type RegisteredSubscription = { broadcastId: string; notify: () => void; close: () => void }

type TimerTask = {
  callback: () => void | Promise<void>
  delay: number
  id: number
  nextRunAt: number
  repeating: boolean
}

class TimerController {
  private nextId = 1
  private now = 0
  private readonly tasks = new Map<number, TimerTask>()

  advanceBy = async (durationMs: number) => {
    const targetTime = this.now + durationMs

    while (true) {
      const nextTask = [...this.tasks.values()]
        .filter((task) => task.nextRunAt <= targetTime)
        .sort((left, right) => left.nextRunAt - right.nextRunAt)[0]

      if (!nextTask) {
        break
      }

      this.now = nextTask.nextRunAt
      if (!nextTask.repeating) {
        this.tasks.delete(nextTask.id)
      } else {
        nextTask.nextRunAt += nextTask.delay
      }

      void nextTask.callback()
      await flushAsync()
    }

    this.now = targetTime
  }

  clearInterval = (taskId: number) => {
    this.tasks.delete(taskId)
  }

  clearTimeout = (taskId: number) => {
    this.tasks.delete(taskId)
  }

  setInterval = (callback: () => void | Promise<void>, delay: number) => {
    return this.schedule(callback, delay, true)
  }

  setTimeout = (callback: () => void | Promise<void>, delay: number) => {
    return this.schedule(callback, delay, false)
  }

  private schedule(callback: () => void | Promise<void>, delay: number, repeating: boolean) {
    const id = this.nextId
    this.nextId += 1
    this.tasks.set(id, {
      callback,
      delay,
      id,
      nextRunAt: this.now + delay,
      repeating,
    })
    return id
  }
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, reject, resolve }
}

function createItem(id: string, broadcastId: string, overrides: Partial<BroadcastItem> = {}): BroadcastItem {
  return {
    id,
    broadcastId,
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

function createBroadcast(id: string, slug: string, itemIds: string[]): Broadcast {
  return {
    id,
    workspaceId: "workspace-id",
    createdBy: "user-id",
    title: `Broadcast ${id}`,
    description: "",
    slug,
    kind: "audio",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    items: itemIds.map((itemId, index) => createItem(itemId, id, { sortOrder: index })),
  }
}

function createDocumentStub() {
  const listeners = new Map<string, Set<() => void>>()

  return {
    listeners,
    addEventListener(eventName: string, listener: () => void) {
      const currentListeners = listeners.get(eventName) ?? new Set<() => void>()
      currentListeners.add(listener)
      listeners.set(eventName, currentListeners)
    },
    removeEventListener(eventName: string, listener: () => void) {
      listeners.get(eventName)?.delete(listener)
    },
    visibilityState: "hidden" as DocumentVisibilityState,
  }
}

async function flushAsync() {
  await Promise.resolve()
  await Promise.resolve()
}

let fetchBroadcastByIdImplementation: (id: string) => Promise<Broadcast | null> = () => Promise.resolve(null)
let fetchPublicBroadcastImplementation: (slug: string) => Promise<Broadcast | null> = () => Promise.resolve(null)
let subscribeImplementation: (id: string, notify: () => void) => () => void = () => () => undefined
const registeredSubscriptions: RegisteredSubscription[] = []
const closedSubscriptions: string[] = []
let documentStub = createDocumentStub()

mock.module("react", () => ({ ...React, ...createMockReactModule() }))
mock.module("@/data/fetch-public-broadcast", () => ({
  fetchBroadcastById(id: string) {
    return fetchBroadcastByIdImplementation(id)
  },
  fetchPublicBroadcast(slug: string) {
    return fetchPublicBroadcastImplementation(slug)
  },
}))
mock.module("@/lib/moc-client", () => ({
  moc: {
    broadcasts: {
      subscribe(id: string, notify: () => void) {
        return subscribeImplementation(id, notify)
      },
    },
  },
}))

const { usePublicBroadcast } = await import("../../../../../apps/broadcast/src/features/use-public-broadcast")

describe("usePublicBroadcast", () => {
  let originalClearInterval: typeof globalThis.clearInterval
  let originalClearTimeout: typeof globalThis.clearTimeout
  let originalDocument: Document | undefined
  let originalSetInterval: typeof globalThis.setInterval
  let originalSetTimeout: typeof globalThis.setTimeout
  let timers: TimerController

  beforeEach(() => {
    fetchBroadcastByIdImplementation = () => Promise.resolve(null)
    fetchPublicBroadcastImplementation = () => Promise.resolve(null)
    subscribeImplementation = (broadcastId, notify) => {
      const subscription: RegisteredSubscription = {
        broadcastId,
        notify,
        close() { closedSubscriptions.push(broadcastId) },
      }
      registeredSubscriptions.push(subscription)
      return subscription.close
    }
    registeredSubscriptions.length = 0
    closedSubscriptions.length = 0
    timers = new TimerController()
    originalClearInterval = globalThis.clearInterval
    originalClearTimeout = globalThis.clearTimeout
    originalDocument = globalThis.document
    originalSetInterval = globalThis.setInterval
    originalSetTimeout = globalThis.setTimeout
    documentStub = createDocumentStub()
    globalThis.document = documentStub as unknown as Document
    globalThis.clearInterval = timers.clearInterval as typeof globalThis.clearInterval
    globalThis.clearTimeout = timers.clearTimeout as typeof globalThis.clearTimeout
    globalThis.setInterval = timers.setInterval as typeof globalThis.setInterval
    globalThis.setTimeout = timers.setTimeout as typeof globalThis.setTimeout
  })

  afterEach(() => {
    globalThis.clearInterval = originalClearInterval
    globalThis.clearTimeout = originalClearTimeout
    globalThis.document = originalDocument as Document
    globalThis.setInterval = originalSetInterval
    globalThis.setTimeout = originalSetTimeout
  })

  test("does not let an old background refresh overwrite a newer broadcast", async () => {
    const alpha = createBroadcast("alpha", "alpha-slug", ["one"])
    const beta = createBroadcast("beta", "beta-slug", ["two"])
    const staleAlphaRefresh = createDeferred<Broadcast | null>()

    fetchPublicBroadcastImplementation = async (slug) => slug === "alpha-slug" ? alpha : beta
    fetchBroadcastByIdImplementation = async (id) => {
      if (id === "alpha") {
        return staleAlphaRefresh.promise
      }

      return beta
    }

    const runtime = new HookRuntime(usePublicBroadcast, "alpha-slug" as string | undefined)
    runtime.render("alpha-slug")
    await flushAsync()
    runtime.rerender()

    expect(runtime.result?.broadcast?.id).toBe("alpha")

    registeredSubscriptions[0]?.notify()
    await timers.advanceBy(500)
    runtime.rerender()

    runtime.render("beta-slug")
    await flushAsync()
    runtime.rerender()

    expect(runtime.result?.broadcast?.id).toBe("beta")

    staleAlphaRefresh.resolve(createBroadcast("alpha", "alpha-slug", ["stale"]))
    await flushAsync()
    runtime.rerender()

    expect(runtime.result?.broadcast?.id).toBe("beta")
  })

  test("hides the previous broadcast immediately when the route slug changes", async () => {
    const alpha = createBroadcast("alpha", "alpha-slug", ["one"])
    const pendingBeta = createDeferred<Broadcast | null>()
    fetchPublicBroadcastImplementation = (slug) => slug === "alpha-slug" ? Promise.resolve(alpha) : pendingBeta.promise

    const runtime = new HookRuntime(usePublicBroadcast, "alpha-slug" as string | undefined)
    runtime.render("alpha-slug")
    await flushAsync()
    runtime.rerender()

    expect(runtime.result?.broadcast?.id).toBe("alpha")

    const routeChangeResult = runtime.render("beta-slug")

    expect(routeChangeResult.broadcast).toBeNull()
    expect(routeChangeResult.isLoading).toBe(true)
  })

  test("re-subscribes and refreshes against the new broadcast id only", async () => {
    const alpha = createBroadcast("alpha", "alpha-slug", ["one"])
    const beta = createBroadcast("beta", "beta-slug", ["two"])
    const refreshCalls: string[] = []

    fetchPublicBroadcastImplementation = async (slug) => slug === "alpha-slug" ? alpha : beta
    fetchBroadcastByIdImplementation = async (id) => {
      refreshCalls.push(id)
      return id === "alpha" ? alpha : beta
    }

    const runtime = new HookRuntime(usePublicBroadcast, "alpha-slug" as string | undefined)
    runtime.render("alpha-slug")
    await flushAsync()
    runtime.rerender()

    runtime.render("beta-slug")
    await flushAsync()
    runtime.rerender()

    await timers.advanceBy(60_000)
    runtime.rerender()

    expect(registeredSubscriptions.map((subscription) => subscription.broadcastId)).toEqual(["alpha", "beta"])
    expect(closedSubscriptions).toEqual(["alpha"])
    expect(refreshCalls).toEqual(["beta"])
    expect(runtime.result?.broadcast?.items[0]?.id).toBe("two")
  })

  test("debounces revision events and keeps the current broadcast after a background failure", async () => {
    const alpha = createBroadcast("alpha", "alpha-slug", ["one"])
    let failRefresh = false
    let refreshCalls = 0
    fetchPublicBroadcastImplementation = async () => alpha
    fetchBroadcastByIdImplementation = async () => {
      refreshCalls += 1
      if (failRefresh) throw new Error("temporary network failure")
      return createBroadcast("alpha", "alpha-slug", ["updated"])
    }

    const runtime = new HookRuntime(usePublicBroadcast, "alpha-slug" as string | undefined)
    runtime.render("alpha-slug")
    await flushAsync()
    runtime.rerender()

    registeredSubscriptions[0]?.notify()
    registeredSubscriptions[0]?.notify()
    await timers.advanceBy(499)
    expect(refreshCalls).toBe(0)
    await timers.advanceBy(1)
    runtime.rerender()
    expect(refreshCalls).toBe(1)
    expect(runtime.result?.broadcast?.items[0]?.id).toBe("updated")

    failRefresh = true
    registeredSubscriptions[0]?.notify()
    await timers.advanceBy(500)
    runtime.rerender()
    expect(runtime.result?.broadcast?.items[0]?.id).toBe("updated")
  })

  test("refreshes after the tab becomes visible", async () => {
    const alpha = createBroadcast("alpha", "alpha-slug", ["one"])
    const refreshed = createBroadcast("alpha", "alpha-slug", ["visible-refresh"])
    let refreshCalls = 0
    fetchPublicBroadcastImplementation = async () => alpha
    fetchBroadcastByIdImplementation = async () => {
      refreshCalls += 1
      return refreshed
    }
    const runtime = new HookRuntime(usePublicBroadcast, "alpha-slug" as string | undefined)
    runtime.render("alpha-slug")
    await flushAsync()
    runtime.rerender()

    documentStub.visibilityState = "visible"
    for (const listener of documentStub.listeners.get("visibilitychange") ?? []) listener()
    await timers.advanceBy(500)
    runtime.rerender()

    expect(refreshCalls).toBe(1)
    expect(runtime.result?.broadcast?.items[0]?.id).toBe("visible-refresh")
  })
})
