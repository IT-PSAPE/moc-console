import type { BroadcastEditorErrors } from "./broadcast-editor-types"

type BroadcastEditorValidationInput = {
  itemCount: number
  title: string
}

export function getBroadcastEditorErrors({ itemCount, title }: BroadcastEditorValidationInput): BroadcastEditorErrors {
  const errors: BroadcastEditorErrors = {}

  if (!title.trim()) {
    errors.title = "Enter a title."
  }

  if (itemCount === 0) {
    errors.playlist = "Add at least one file to the playlist."
  }

  return errors
}
