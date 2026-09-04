import { describe, expect, test } from "bun:test"
import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { getBroadcastEditorErrors, splitBroadcastFilesByKind } from "./broadcast-editor-validation"

function createFile(name: string, type: string): File {
  return new File(["content"], name, { type })
}

describe("getBroadcastEditorErrors", () => {
  test("requires a trimmed title and at least one playlist item", () => {
    expect(getBroadcastEditorErrors({ itemCount: 0, title: "   " })).toEqual({
      playlist: "Add at least one file to the playlist.",
      title: "Enter a title.",
    })
  })

  test("returns no errors when the required fields are present", () => {
    expect(getBroadcastEditorErrors({ itemCount: 1, title: "Sunday service" })).toEqual({})
  })
})

describe("splitBroadcastFilesByKind", () => {
  test("keeps files matching the selected media kind and reports the rejected ones", () => {
    const audioFile = createFile("intro.mp3", "audio/mpeg")
    const videoFile = createFile("sermon.mp4", "video/mp4")
    const genericFile = createFile("notes.txt", "text/plain")

    expect(splitBroadcastFilesByKind("audio" satisfies BroadcastKind, [audioFile, videoFile, genericFile])).toEqual({
      acceptedFiles: [audioFile],
      rejectedFiles: [videoFile, genericFile],
    })
  })
})
