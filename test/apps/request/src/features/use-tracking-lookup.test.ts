import type { TrackingResult } from "../../../../../apps/request/src/types/tracking"
import * as React from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { HookRuntime, createMockReactModule } from "../../../broadcast/src/features/test-hook-runtime"

type Deferred<T> = {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T) => void
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

function createRequestResult(trackingCode: string): TrackingResult {
  return {
    id: trackingCode,
    trackingCode,
    type: "request",
    status: "not_started",
    title: `Request ${trackingCode}`,
    category: "general",
    categoryName: "General",
    requestedBy: "Requester",
    dueDate: "2026-10-22T09:00:00.000Z",
    who: "Team",
    what: "Prepare",
    whenText: "Tomorrow",
    whereText: "Hall",
    why: "Needed",
    how: "Together",
    flow: null,
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
  }
}

async function flushAsync() {
  await Promise.resolve()
  await Promise.resolve()
}

let lookupImplementation: (code: string) => Promise<TrackingResult | null> = () => Promise.resolve(null)
const lookupTrackingCode = vi.fn((code: string) => lookupImplementation(code))
let deleteImplementation: (result: TrackingResult) => Promise<void> = () => Promise.resolve()
const deleteTrackedSubmission = vi.fn((result: TrackingResult) => deleteImplementation(result))

vi.doMock("react", () => ({ ...React, ...createMockReactModule() }))
vi.doMock("../../../../../apps/request/src/data/tracking-submissions", () => ({
  deleteTrackedSubmission(result: TrackingResult) {
    return deleteTrackedSubmission(result)
  },
  lookupTrackingCode(code: string) {
    return lookupTrackingCode(code)
  },
}))

const { useTrackingLookup } = await import("../../../../../apps/request/src/features/hooks/use-tracking-lookup")

describe("useTrackingLookup", () => {
  beforeEach(() => {
    lookupImplementation = () => Promise.resolve(null)
    deleteImplementation = () => Promise.resolve()
    lookupTrackingCode.mockClear()
    deleteTrackedSubmission.mockClear()
  })

  test("clears loaded state on code change and ignores an old rejection while the newer lookup is pending", async () => {
    const existingResult = createRequestResult("REQ-EXISTING")
    const oldLookup = createDeferred<TrackingResult | null>()
    const latestLookup = createDeferred<TrackingResult | null>()
    lookupImplementation = (code) => code === "REQ-OLD" ? oldLookup.promise : Promise.resolve(existingResult)
    const runtime = new HookRuntime(useTrackingLookup)

    runtime.render(undefined)
    runtime.result?.actions.setCode(" req-existing ")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()
    expect(runtime.result?.state.result).toEqual(existingResult)

    runtime.result?.actions.beginEdit()
    runtime.result?.actions.openDelete()
    runtime.result?.actions.setCode(" req-old ")
    runtime.rerender()
    expect(runtime.result?.state.result).toBeNull()
    expect(runtime.result?.state.editing).toBe(false)
    expect(runtime.result?.state.deleteOpen).toBe(false)
    expect(runtime.result?.state.error).toBeNull()

    lookupImplementation = (code) => code === "REQ-OLD" ? oldLookup.promise : latestLookup.promise
    void runtime.result?.actions.lookup()
    runtime.rerender()
    runtime.result?.actions.setCode(" req-latest ")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    runtime.rerender()

    expect(lookupTrackingCode.mock.calls.map(([code]) => code)).toEqual(["REQ-EXISTING", "REQ-OLD", "REQ-LATEST"])

    oldLookup.reject(new Error("stale failure"))
    await flushAsync()
    runtime.rerender()
    expect(runtime.result?.state.result).toBeNull()
    expect(runtime.result?.state.error).toBeNull()
    expect(runtime.result?.state.loading).toBe(true)

    latestLookup.resolve(createRequestResult("REQ-LATEST"))
    await flushAsync()
    runtime.rerender()
    expect(runtime.result?.state.result?.trackingCode).toBe("REQ-LATEST")
    expect(runtime.result?.state.loading).toBe(false)
  })

  test("keeps the newest result when overlapping lookups resolve out of order", async () => {
    const firstLookup = createDeferred<TrackingResult | null>()
    const secondLookup = createDeferred<TrackingResult | null>()
    lookupImplementation = (code) => code === "REQ-FIRST" ? firstLookup.promise : secondLookup.promise
    const runtime = new HookRuntime(useTrackingLookup)

    runtime.render(undefined)
    runtime.result?.actions.setCode("req-first")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    runtime.rerender()
    runtime.result?.actions.setCode("req-second")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    runtime.rerender()

    secondLookup.resolve(createRequestResult("REQ-SECOND"))
    await flushAsync()
    runtime.rerender()
    expect(runtime.result?.state.result?.trackingCode).toBe("REQ-SECOND")
    expect(runtime.result?.state.loading).toBe(false)

    firstLookup.resolve(createRequestResult("REQ-FIRST"))
    await flushAsync()
    runtime.rerender()
    expect(runtime.result?.state.result?.trackingCode).toBe("REQ-SECOND")
    expect(runtime.result?.state.loading).toBe(false)
  })

  test("does not restore an edited result after the tracking code changes", async () => {
    const originalResult = createRequestResult("REQ-ORIGINAL")
    const updatedResult = { ...originalResult, title: "Updated request" }
    lookupImplementation = () => Promise.resolve(originalResult)
    const runtime = new HookRuntime(useTrackingLookup)

    runtime.render(undefined)
    runtime.result?.actions.setCode("req-original")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()

    runtime.result?.actions.beginEdit()
    runtime.rerender()
    runtime.result?.actions.setCode("req-next")
    runtime.rerender()
    runtime.result?.actions.handleSaved(updatedResult)
    runtime.rerender()

    expect(runtime.result?.state.result).toBeNull()
    expect(runtime.result?.state.editing).toBe(false)
  })

  test("ignores an old save callback after a new tracking result enters edit mode", async () => {
    const firstResult = createRequestResult("REQ-FIRST")
    const secondResult = createRequestResult("REQ-SECOND")
    const staleSavedResult = { ...firstResult, title: "Stale edit" }
    lookupImplementation = (code) => Promise.resolve(code === "REQ-FIRST" ? firstResult : secondResult)
    const runtime = new HookRuntime(useTrackingLookup)

    runtime.render(undefined)
    runtime.result?.actions.setCode("req-first")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()
    runtime.result?.actions.beginEdit()
    runtime.rerender()
    const oldSaveCallback = runtime.result?.actions.handleSaved

    runtime.result?.actions.setCode("req-second")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()
    runtime.result?.actions.beginEdit()
    runtime.rerender()
    oldSaveCallback?.(staleSavedResult)
    runtime.rerender()

    expect(runtime.result?.state.result).toEqual(secondResult)
    expect(runtime.result?.state.editing).toBe(true)
    expect(runtime.result?.state.notice).toBeNull()
  })

  test("ignores a save callback from a cancelled edit when the same result is edited again", async () => {
    const result = createRequestResult("REQ-EDIT")
    const staleSavedResult = { ...result, title: "Stale edit" }
    lookupImplementation = () => Promise.resolve(result)
    const runtime = new HookRuntime(useTrackingLookup)

    runtime.render(undefined)
    runtime.result?.actions.setCode("req-edit")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()
    runtime.result?.actions.beginEdit()
    runtime.rerender()
    const oldSaveCallback = runtime.result?.actions.handleSaved

    runtime.result?.actions.cancelEdit()
    runtime.rerender()
    runtime.result?.actions.beginEdit()
    runtime.rerender()
    oldSaveCallback?.(staleSavedResult)
    runtime.rerender()

    expect(runtime.result?.state.result).toEqual(result)
    expect(runtime.result?.state.editing).toBe(true)
    expect(runtime.result?.state.notice).toBeNull()
  })

  test("preserves a newer lookup result when an earlier deletion finishes", async () => {
    const originalResult = createRequestResult("REQ-DELETE")
    const newerResult = createRequestResult("REQ-NEWER")
    const pendingDelete = createDeferred<void>()
    lookupImplementation = () => Promise.resolve(originalResult)
    deleteImplementation = () => pendingDelete.promise
    const runtime = new HookRuntime(useTrackingLookup)

    runtime.render(undefined)
    runtime.result?.actions.setCode("req-delete")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()

    runtime.result?.actions.openDelete()
    runtime.rerender()
    void runtime.result?.actions.remove()
    runtime.rerender()

    lookupImplementation = () => Promise.resolve(newerResult)
    runtime.result?.actions.setCode("req-newer")
    runtime.rerender()
    void runtime.result?.actions.lookup()
    await flushAsync()
    runtime.rerender()

    expect(runtime.result?.state.result?.trackingCode).toBe("REQ-NEWER")
    pendingDelete.resolve()
    await flushAsync()
    runtime.rerender()

    expect(deleteTrackedSubmission).toHaveBeenCalledWith(originalResult)
    expect(runtime.result?.state.result?.trackingCode).toBe("REQ-NEWER")
    expect(runtime.result?.state.notice).toBeNull()
    expect(runtime.result?.state.deleting).toBe(false)
  })
})
