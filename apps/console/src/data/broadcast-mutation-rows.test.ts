import { describe, expect, test } from "bun:test"
import { buildBroadcastMutationRows } from "./broadcast-mutation-rows"

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
        created_at: "2026-09-03T10:00:00.000Z",
        duration_seconds: 42,
        file_size_bytes: 100,
        id: "existing-id",
        mime_type: "audio/mpeg",
        public_url: "https://example.com/existing.mp3",
        sort_order: 0,
        storage_bucket: "broadcast-media",
        storage_path: "workspace/existing.mp3",
        title: "Existing",
      },
      {
        created_at: null,
        duration_seconds: null,
        file_size_bytes: 200,
        id: null,
        mime_type: "audio/mpeg",
        public_url: "https://example.com/new.mp3",
        sort_order: 1,
        storage_bucket: "broadcast-media",
        storage_path: "workspace/user/new.mp3",
        title: "New",
      },
    ])
  })
})
