// Matches the tag name of the element used to decode the file.
export type MediaElementKind = "audio" | "video"

export type MediaProbeResult = {
  // False when the browser fired `error` on the element — the bytes are not
  // decodable media. A decodable file with an unknown length is still valid.
  isDecodable: boolean
  durationSeconds: number | null
}

const UNDECODABLE: MediaProbeResult = { durationSeconds: null, isDecodable: false }

function canDecodeMedia(): boolean {
  return typeof document !== "undefined"
    && typeof document.createElement === "function"
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function"
}

// Loads the file into a detached media element to find out whether the browser
// can actually decode it, and how long it runs. This is the only check that
// catches a file with the right name, type and size but corrupt or unsupported
// contents, so it gates both the editor and the upload itself.
export async function probeMediaFile(file: File, kind: MediaElementKind): Promise<MediaProbeResult> {
  // Outside a real browser there is nothing to decode with, so the file gets
  // the benefit of the doubt and the other checks stand on their own. Probe for
  // the two APIs actually used rather than for `document` — a partial DOM shim
  // defines the global without them.
  if (!canDecodeMedia()) return { durationSeconds: null, isDecodable: true }

  const objectUrl = URL.createObjectURL(file)

  try {
    return await new Promise<MediaProbeResult>((resolve) => {
      const media = document.createElement(kind)

      function handleLoadedMetadata() {
        cleanup()
        resolve({ durationSeconds: Number.isFinite(media.duration) ? media.duration : null, isDecodable: true })
      }

      function handleError() {
        cleanup()
        resolve(UNDECODABLE)
      }

      function cleanup() {
        media.removeEventListener("loadedmetadata", handleLoadedMetadata)
        media.removeEventListener("error", handleError)
        media.removeAttribute("src")
        media.load()
      }

      media.preload = "metadata"
      media.addEventListener("loadedmetadata", handleLoadedMetadata)
      media.addEventListener("error", handleError)
      media.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
