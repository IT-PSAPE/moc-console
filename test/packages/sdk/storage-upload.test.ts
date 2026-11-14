import { afterEach, describe, expect, test, vi } from "vitest"
import { createStorageClient } from "../../../packages/sdk/src/storage"
import { createMocTransport } from "../../../packages/sdk/src/transport"

const result = { bucket: "avatars", path: "user/avatar.png", url: "/api/storage/avatars/user/avatar.png", size: 5, contentType: "image/png" }
const created = { ...result, id: "upload-id", chunkSize: 4, expectedChunks: 2 }
const file = new File([new Uint8Array([1, 2, 3, 4, 5])], "face.png", { type: "image/png" })

afterEach(() => vi.useRealTimers())

describe("storage upload lifetimes", () => {
  test("an already canceled upload does not create a server upload", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
    const storage = createStorageClient(createMocTransport("https://api.example.test", { fetchImpl }))
    const controller = new AbortController()
    controller.abort()

    await expect(storage.upload({ purpose: "avatar", file, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test("canceling during a chunk request aborts the request and prevents progress/finalization", async () => {
    const controller = new AbortController()
    const progress = vi.fn()
    const urls: string[] = []
    const fetchImpl: typeof fetch = async (url, init) => {
      urls.push(String(url))
      if (String(url).endsWith("/uploads")) return Response.json(created)
      expect(init?.signal).toBe(controller.signal)
      controller.abort()
      throw controller.signal.reason
    }
    const storage = createStorageClient(createMocTransport("https://api.example.test", { fetchImpl }))

    await expect(storage.upload({ purpose: "avatar", file, onProgress: progress, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" })
    expect(urls).toHaveLength(2)
    expect(progress).not.toHaveBeenCalled()
  })

  test("canceling between polls immediately rejects and removes its timers", async () => {
    vi.useFakeTimers()
    const signals: AbortSignal[] = []
    const urls: string[] = []
    const fetchImpl: typeof fetch = async (url, init) => {
      urls.push(String(url))
      if (init?.signal) signals.push(init.signal)
      if (String(url).endsWith("/uploads")) return Response.json(created)
      if (String(url).endsWith("/upload-id")) return Response.json({ status: "processing", result: null })
      return Response.json({})
    }
    const storage = createStorageClient(createMocTransport("https://api.example.test", { fetchImpl }))
    const controller = new AbortController()
    const pending = storage.upload({ purpose: "avatar", file, signal: controller.signal })
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" })
    await vi.advanceTimersByTimeAsync(0)
    expect(urls).toHaveLength(5)

    controller.abort()
    await rejected
    await vi.advanceTimersByTimeAsync(60_000)

    expect(urls).toHaveLength(5)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  test("a stalled finalization request has a finite deadline and an actionable typed error", async () => {
    vi.useFakeTimers()
    let finalizeSignal: AbortSignal | null = null
    const fetchImpl: typeof fetch = async (url, init) => {
      if (String(url).endsWith("/uploads")) return Response.json(created)
      if (String(url).endsWith("/finalize")) {
        const signal = init?.signal
        if (!signal) throw new Error("Missing finalization signal")
        finalizeSignal = signal
        return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))
      }
      return Response.json({})
    }
    const storage = createStorageClient(createMocTransport("https://api.example.test", { fetchImpl }))
    const pending = storage.upload({ purpose: "avatar", file })
    const rejected = expect(pending).rejects.toMatchObject({
      name: "MocApiError", status: 408, code: "upload_processing_timeout", details: { uploadId: "upload-id" },
    })

    await vi.advanceTimersByTimeAsync(15 * 60_000)
    await rejected
    expect(finalizeSignal).toHaveProperty("aborted", true)
    expect(vi.getTimerCount()).toBe(0)
  })

  test("a permanently queued worker stops polling after the deadline", async () => {
    vi.useFakeTimers()
    let polls = 0
    const fetchImpl: typeof fetch = async (url) => {
      if (String(url).endsWith("/uploads")) return Response.json(created)
      if (String(url).endsWith("/upload-id")) { polls += 1; return Response.json({ status: "queued", result: null }) }
      return Response.json({})
    }
    const storage = createStorageClient(createMocTransport("https://api.example.test", { fetchImpl }))
    const rejected = expect(storage.upload({ purpose: "avatar", file })).rejects.toMatchObject({ code: "upload_processing_timeout" })
    await vi.advanceTimersByTimeAsync(15 * 60_000)
    await rejected
    const stoppedAt = polls
    expect(stoppedAt).toBeGreaterThan(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(polls).toBe(stoppedAt)
    expect(vi.getTimerCount()).toBe(0)
  })

  test("normal worker completion clears the deadline and returns its result", async () => {
    vi.useFakeTimers()
    let polls = 0
    const fetchImpl: typeof fetch = async (url) => {
      if (String(url).endsWith("/uploads")) return Response.json(created)
      if (String(url).endsWith("/upload-id")) {
        polls += 1
        return Response.json({ status: polls === 1 ? "queued" : "complete", result: polls === 1 ? null : result })
      }
      return Response.json({})
    }
    const storage = createStorageClient(createMocTransport("https://api.example.test", { fetchImpl }))
    const pending = storage.upload({ purpose: "avatar", file })
    await vi.advanceTimersByTimeAsync(400)
    await expect(pending).resolves.toEqual(result)
    expect(polls).toBe(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
