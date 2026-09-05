import { describe, expect, test } from "bun:test"
import { APPLE_DOUBLE_REASON, formatFileSize, getFileRejectionReason, isAppleDoubleName, matchesAccept, partitionFiles } from "./file-constraints"

function createFile(name: string, type: string, size = 1024 * 1024): File {
  const file = new File(["x"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("matchesAccept", () => {
  test("accepts everything when no accept list is given", () => {
    expect(matchesAccept(createFile("notes.txt", "text/plain"), undefined)).toBe(true)
  })

  test("matches on an exact mime type, a wildcard, and an extension", () => {
    const file = createFile("intro.mp3", "audio/mpeg")

    expect(matchesAccept(file, "audio/mpeg")).toBe(true)
    expect(matchesAccept(file, "audio/*")).toBe(true)
    expect(matchesAccept(file, ".mp3,.wav")).toBe(true)
    expect(matchesAccept(file, "video/mp4,.mp4")).toBe(false)
  })

  test("still matches by extension when the browser reports no type", () => {
    expect(matchesAccept(createFile("intro.flac", ""), "audio/flac,.flac")).toBe(true)
  })
})

describe("getFileRejectionReason", () => {
  test("passes a file inside every constraint", () => {
    const reason = getFileRejectionReason(createFile("intro.mp3", "audio/mpeg"), {
      accept: "audio/mpeg",
      maxSizeBytes: 2 * 1024 * 1024,
      minSizeBytes: 4096,
    })

    expect(reason).toBeNull()
  })

  test("names the constraint that failed", () => {
    const constraints = { accept: "audio/mpeg,.mp3", maxSizeBytes: 1024, minSizeBytes: 512 }

    expect(getFileRejectionReason(createFile("clip.mp4", "video/mp4", 800), constraints)).toBe("Unsupported file type.")
    expect(getFileRejectionReason(createFile("tiny.mp3", "audio/mpeg", 178), constraints)).toBe("Only 178 B — too small to be a real file.")
    expect(getFileRejectionReason(createFile("big.mp3", "audio/mpeg", 4096), constraints)).toBe("4 KB is over the 1 KB limit.")
  })

  test("names a macOS sidecar before the generic size or type reason", () => {
    const sidecar = createFile("._intro.mp3", "audio/mpeg", 178)

    expect(isAppleDoubleName(sidecar.name)).toBe(true)
    expect(getFileRejectionReason(sidecar, { accept: "audio/mpeg", minSizeBytes: 4096 })).toBe(APPLE_DOUBLE_REASON)
  })
})

describe("partitionFiles", () => {
  test("checks every file rather than stopping at the first failure", () => {
    const good = createFile("intro.mp3", "audio/mpeg")
    const wrongType = createFile("notes.txt", "text/plain")
    const tooSmall = createFile("sidecar.mp3", "audio/mpeg", 178)

    const { acceptedFiles, rejections } = partitionFiles([wrongType, good, tooSmall], {
      accept: "audio/mpeg",
      minSizeBytes: 4096,
    })

    expect(acceptedFiles).toEqual([good])
    expect(rejections.map((rejection) => rejection.file)).toEqual([wrongType, tooSmall])
    expect(rejections.every((rejection) => rejection.reason.length > 0)).toBe(true)
  })
})

describe("formatFileSize", () => {
  test("scales the unit to the size", () => {
    expect(formatFileSize(178)).toBe("178 B")
    expect(formatFileSize(2048)).toBe("2 KB")
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB")
    expect(formatFileSize(1536 * 1024)).toBe("1.5 MB")
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2 GB")
  })
})
