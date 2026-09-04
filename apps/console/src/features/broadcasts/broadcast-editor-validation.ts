import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import type { BroadcastEditorErrors } from "./broadcast-editor-types"

type BroadcastEditorValidationInput = {
  itemCount: number
  title: string
}

type BroadcastFilePartition = {
  acceptedFiles: File[]
  rejectedFiles: File[]
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

export function splitBroadcastFilesByKind(kind: BroadcastKind, files: File[]): BroadcastFilePartition {
  return files.reduce<BroadcastFilePartition>((partition, file) => {
    if (file.type.startsWith(`${kind}/`)) {
      partition.acceptedFiles.push(file)
    } else {
      partition.rejectedFiles.push(file)
    }

    return partition
  }, { acceptedFiles: [], rejectedFiles: [] })
}
