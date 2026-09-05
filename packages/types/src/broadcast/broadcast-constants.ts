import type { BroadcastKind } from "./broadcast"

export const BROADCAST_MEDIA_BUCKET = "broadcast-media"

export const BROADCAST_KIND_LABELS: Record<BroadcastKind, string> = {
  audio: "Audio",
  video: "Video",
}

// Browsers derive a file's type from its extension, so `audio/*` alone lets
// anything named `*.wav` through — including the macOS AppleDouble sidecars
// (`._track.wav`) that Finder writes next to real files on USB sticks and in
// zips. Allow-listing concrete types and extensions is the first gate; the
// size floor and the decode probe in `broadcast-file-check.ts` are the rest.
export const BROADCAST_MIME_TYPES: Record<BroadcastKind, string[]> = {
  audio: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/wave", "audio/x-wav", "audio/webm", "audio/flac", "audio/x-flac"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v"],
}

export const BROADCAST_FILE_EXTENSIONS: Record<BroadcastKind, string[]> = {
  audio: [".mp3", ".m4a", ".aac", ".ogg", ".oga", ".wav", ".weba", ".flac"],
  video: [".mp4", ".webm", ".ogv", ".mov", ".m4v"],
}

export const BROADCAST_FILE_ACCEPT: Record<BroadcastKind, string> = {
  audio: [...BROADCAST_MIME_TYPES.audio, ...BROADCAST_FILE_EXTENSIONS.audio].join(","),
  video: [...BROADCAST_MIME_TYPES.video, ...BROADCAST_FILE_EXTENSIONS.video].join(","),
}

// An AppleDouble sidecar is 178 bytes; no real playable track is under 4 KB.
export const BROADCAST_MIN_FILE_BYTES = 4 * 1024

// Keep these at or below the Supabase project's global upload limit, otherwise
// storage rejects the file after the browser has already accepted it.
export const BROADCAST_MAX_FILE_BYTES: Record<BroadcastKind, number> = {
  audio: 50 * 1024 * 1024,
  video: 500 * 1024 * 1024,
}
