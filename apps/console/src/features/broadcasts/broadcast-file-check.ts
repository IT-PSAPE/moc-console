import { probeMediaFile } from "@moc/utils/probe-media-file"
import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { BROADCAST_FILE_ACCEPT, BROADCAST_KIND_LABELS, BROADCAST_MAX_FILE_BYTES, BROADCAST_MIN_FILE_BYTES } from "@moc/types/broadcast/broadcast-constants"
import { APPLE_DOUBLE_REASON, formatFileSize, getFileRejectionReason, type FileRejection } from "@moc/utils/file-constraints"

export type BroadcastFileCheck = {
  acceptedFiles: File[]
  rejections: FileRejection[]
}

// The name check lives in @moc/utils; this catches a sidecar that was renamed,
// by the AppleDouble magic number in its first four bytes.
const APPLE_DOUBLE_MAGIC = [0x00, 0x05, 0x16, 0x07]

async function hasAppleDoubleMagic(file: File): Promise<boolean> {
  try {
    const header = new Uint8Array(await file.slice(0, APPLE_DOUBLE_MAGIC.length).arrayBuffer())
    return APPLE_DOUBLE_MAGIC.every((byte, index) => header[index] === byte)
  } catch {
    return false
  }
}

export function getBroadcastFileHint(kind: BroadcastKind): string {
  return `${BROADCAST_KIND_LABELS[kind]} files up to ${formatFileSize(BROADCAST_MAX_FILE_BYTES[kind])} each. Every file is checked before it is added.`
}

// Returns the reason this file cannot go into the playlist, or null if it can.
// Ordered cheapest-first so the decode probe only runs on plausible files.
export async function getBroadcastFileRejectionReason(file: File, kind: BroadcastKind): Promise<string | null> {
  const constraintReason = getFileRejectionReason(file, {
    accept: BROADCAST_FILE_ACCEPT[kind],
    maxSizeBytes: BROADCAST_MAX_FILE_BYTES[kind],
    minSizeBytes: BROADCAST_MIN_FILE_BYTES,
  })

  // A sidecar that was renamed still fails on size; name the real cause.
  if (constraintReason) {
    return file.size < BROADCAST_MIN_FILE_BYTES && (await hasAppleDoubleMagic(file))
      ? APPLE_DOUBLE_REASON
      : constraintReason
  }

  if (await hasAppleDoubleMagic(file)) return APPLE_DOUBLE_REASON

  const { isDecodable } = await probeMediaFile(file, kind)
  if (!isDecodable) {
    return `This ${kind} could not be decoded. The file may be damaged or use an unsupported codec.`
  }

  return null
}

// Checks every file — one bad file never discards the rest of the batch — and
// reports each rejection with its own reason.
export async function checkBroadcastFiles(files: File[], kind: BroadcastKind): Promise<BroadcastFileCheck> {
  const results = await Promise.all(
    files.map(async (file) => ({ file, reason: await getBroadcastFileRejectionReason(file, kind) })),
  )

  return {
    acceptedFiles: results.filter((result) => result.reason === null).map((result) => result.file),
    rejections: results.flatMap((result) => (result.reason === null ? [] : [{ file: result.file, reason: result.reason }])),
  }
}
