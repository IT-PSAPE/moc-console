import { describe, expect, test } from "vitest"
import {
  ASSEMBLY_PART_SIZE,
  MAX_CHUNK_SIZE,
  getUploadPolicy,
  makeUploadUrl,
  parseSingleByteRange,
  planChunks,
} from "../../../../packages/backend/src/storage/upload-protocol"

describe("storage upload protocol", () => {
  test("keeps browser chunks under the Vercel body limit and plans exact coverage", () => {
    const chunks = planChunks(ASSEMBLY_PART_SIZE + MAX_CHUNK_SIZE + 1)

    expect(chunks).toEqual([
      { index: 0, start: 0, endExclusive: MAX_CHUNK_SIZE },
      { index: 1, start: MAX_CHUNK_SIZE, endExclusive: ASSEMBLY_PART_SIZE },
      { index: 2, start: ASSEMBLY_PART_SIZE, endExclusive: ASSEMBLY_PART_SIZE + MAX_CHUNK_SIZE },
      { index: 3, start: ASSEMBLY_PART_SIZE + MAX_CHUNK_SIZE, endExclusive: ASSEMBLY_PART_SIZE + MAX_CHUNK_SIZE + 1 },
    ])
    expect(chunks.every((chunk) => chunk.endExclusive - chunk.start <= MAX_CHUNK_SIZE)).toBe(true)
  })

  test("rejects empty, negative, unsafe, and oversized uploads by purpose", () => {
    expect(getUploadPolicy("avatar", 0)).toMatchObject({ ok: false })
    expect(getUploadPolicy("avatar", 50 * 1024 * 1024 + 1)).toMatchObject({ ok: false })
    expect(getUploadPolicy("broadcast-audio", Number.MAX_SAFE_INTEGER + 1)).toMatchObject({ ok: false })
    expect(getUploadPolicy("stream-thumbnail", 1024)).toMatchObject({ ok: true, bucket: "media" })
  })

  test("creates API-owned, path-safe media URLs", () => {
    expect(makeUploadUrl("media", "workspace/id/thumb image.png")).toBe(
      "/api/storage/media/workspace/id/thumb%20image.png",
    )
    expect(() => makeUploadUrl("provider", "https://example.test/file")).toThrow()
  })

  test("parses bounded single byte ranges, including open and suffix ranges", () => {
    expect(parseSingleByteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 })
    expect(parseSingleByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 })
    expect(parseSingleByteRange("bytes=-12", 100)).toEqual({ start: 88, end: 99 })
    expect(parseSingleByteRange("bytes=100-", 100)).toEqual({ unsatisfiable: true })
    expect(parseSingleByteRange("bytes=1-2,5-6", 100)).toEqual({ unsatisfiable: true })
    expect(parseSingleByteRange(null, 100)).toBeNull()
  })
})
