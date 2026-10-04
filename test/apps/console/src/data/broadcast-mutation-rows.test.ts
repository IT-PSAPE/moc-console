import { describe, expect, test } from "vitest"
import { buildBroadcastMutationRows } from "../../../../../apps/console/src/data/broadcast-mutation-rows"

describe("buildBroadcastMutationRows", () => {
  test("preserves existing ids and assigns contiguous playlist order", () => {
    const rows = buildBroadcastMutationRows([
      {
        createdAt: "2026-09-03T10:00:00.000Z",
        durationSeconds: 42,
        fileSizeBytes: 100,
        id: "existing-id",
        mimeType: "audio/mpeg",
        publicUrl: "https://example.com/existing.mp3",
        storageBucket: "broadcast-media",
        storagePath: "workspace/existing.mp3",
        title: "Existing",
      },
      {
        durationSeconds: null,
        fileSizeBytes: 200,
        mimeType: "audio/mpeg",
        publicUrl: "https://example.com/new.mp3",
        storageBucket: "broadcast-media",
        storagePath: "workspace/user/new.mp3",
        title: "New",
      },
    ])

    expect(rows).toEqual([
      {
        createdAt: "2026-09-03T10:00:00.000Z",
        durationSeconds: 42,
        fileSizeBytes: 100,
        id: "existing-id",
        mimeType: "audio/mpeg",
        publicUrl: "https://example.com/existing.mp3",
        sortOrder: 0,
        storageBucket: "broadcast-media",
        storagePath: "workspace/existing.mp3",
        title: "Existing",
      },
      {
        createdAt: null,
        durationSeconds: null,
        fileSizeBytes: 200,
        id: null,
        mimeType: "audio/mpeg",
        publicUrl: "https://example.com/new.mp3",
        sortOrder: 1,
        storageBucket: "broadcast-media",
        storagePath: "workspace/user/new.mp3",
        title: "New",
      },
    ])
  })
})
