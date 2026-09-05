import { describe, expect, test } from "bun:test"
import { getBroadcastEditorErrors } from "./broadcast-editor-validation"

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
