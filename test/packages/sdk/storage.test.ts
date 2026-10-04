import { describe, expect, test } from "bun:test"
import { createStorageClient } from "../../../packages/sdk/src/storage"
import { createMocTransport } from "../../../packages/sdk/src/transport"

describe("storage SDK", () => {
  test("uploads in binary chunks, reports progress, and waits for API finalization", async () => {
    const calls: Array<{ url: string; method: string; body: BodyInit | null | undefined }> = []
    const transport = createMocTransport("https://api.example.test", { fetchImpl: async (url, init) => {
      const requestUrl = String(url)
      calls.push({ url: requestUrl, method: init?.method ?? "GET", body: init?.body })
      if (requestUrl.endsWith("/uploads")) {
        return Response.json({ id: "upload-id", bucket: "avatars", path: "user/avatars/file.png", url: "/api/storage/avatars/user/avatars/file.png", size: 5, contentType: "image/png", chunkSize: 4, expectedChunks: 2 })
      }
      if (requestUrl.endsWith("/finalize")) return Response.json({ status: "queued" })
      if (requestUrl.endsWith("/upload-id")) {
        return Response.json({ id: "upload-id", status: "complete", errorCode: null, result: { bucket: "avatars", path: "user/avatars/file.png", url: "/api/storage/avatars/user/avatars/file.png", size: 5, contentType: "image/png" } })
      }
      return Response.json({ duplicate: false })
    } })
    const storage = createStorageClient(transport)
    const progress: number[] = []
    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], "face.png", { type: "image/png" })

    await expect(storage.upload({ purpose: "avatar", file, onProgress: (event) => progress.push(event.loaded) })).resolves.toMatchObject({
      bucket: "avatars", size: 5, contentType: "image/png",
    })
    expect(calls.map(({ method }) => method)).toEqual(["POST", "PUT", "PUT", "POST", "GET"])
    expect(calls[1]?.body).toBeInstanceOf(Blob)
    expect(calls[2]?.body).toBeInstanceOf(Blob)
    expect(progress).toEqual([4, 5])
  })

  test("reads only bounded ranges from MoC API storage URLs", async () => {
    let requestUrl = ""
    let range = ""
    const transport = createMocTransport("https://api.example.test", { fetchImpl: async (url, init) => {
      requestUrl = String(url)
      range = new Headers(init?.headers).get("Range") ?? ""
      return new Response(new Uint8Array([7, 8, 9]), { status: 206, headers: { "Content-Range": "bytes 2-4/10" } })
    } })
    const storage = createStorageClient(transport)

    await expect(storage.readRange("https://api.example.test/api/storage/broadcast-media/a/b.mp3", 2, 4)).resolves.toEqual(new Uint8Array([7, 8, 9]))
    expect(requestUrl).toBe("https://api.example.test/api/storage/broadcast-media/a/b.mp3")
    expect(range).toBe("bytes=2-4")
    await expect(storage.readRange("https://storage.example.test/object", 2, 4)).rejects.toThrow("API-owned")
    await expect(storage.readRange("https://api.example.test/api/storage/avatars/x", 0, 4 * 1024 * 1024)).rejects.toThrow(RangeError)
  })
})
