import { describe, expect, test } from "bun:test"
import { BROADCAST_MAX_FILE_BYTES } from "@moc/types/broadcast/broadcast-constants"
import { checkBroadcastFiles, getBroadcastFileRejectionReason } from "./broadcast-file-check"

const APPLE_DOUBLE_HEADER = new Uint8Array([0x00, 0x05, 0x16, 0x07, 0x00, 0x02, 0x00, 0x00])

function createFile(name: string, type: string, size = 1024 * 1024): File {
  const file = new File(["x"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

// The real thing: a 178-byte AppleDouble sidecar carrying the original name,
// so its extension and mime type both look like valid audio.
function createAppleDoubleFile(name: string, type: string): File {
  const file = new File([APPLE_DOUBLE_HEADER], name, { type })
  Object.defineProperty(file, "size", { value: 178 })
  return file
}

describe("getBroadcastFileRejectionReason", () => {
  test("rejects a macOS sidecar by its name prefix", async () => {
    const reason = await getBroadcastFileRejectionReason(createAppleDoubleFile("._track.wav", "audio/wav"), "audio")

    expect(reason).toContain("macOS sidecar file")
  })

  test("rejects a sidecar whose name was cleaned up but whose bytes give it away", async () => {
    const file = new File([APPLE_DOUBLE_HEADER], "track.wav", { type: "audio/wav" })
    Object.defineProperty(file, "size", { value: 8 * 1024 })

    expect(await getBroadcastFileRejectionReason(file, "audio")).toContain("macOS sidecar file")
  })

  test("rejects a file of the wrong kind for the playlist", async () => {
    expect(await getBroadcastFileRejectionReason(createFile("sermon.mp4", "video/mp4"), "audio")).toBe("Unsupported file type.")
    expect(await getBroadcastFileRejectionReason(createFile("intro.mp3", "audio/mpeg"), "video")).toBe("Unsupported file type.")
  })

  test("rejects a file over the size limit for its kind", async () => {
    const oversized = createFile("service.mp3", "audio/mpeg", BROADCAST_MAX_FILE_BYTES.audio + 1)

    expect(await getBroadcastFileRejectionReason(oversized, "audio")).toContain("over the 50 MB limit")
  })

  test("accepts a plausible file of the right kind", async () => {
    expect(await getBroadcastFileRejectionReason(createFile("intro.mp3", "audio/mpeg"), "audio")).toBeNull()
    expect(await getBroadcastFileRejectionReason(createFile("sermon.mp4", "video/mp4"), "video")).toBeNull()
  })
})

describe("checkBroadcastFiles", () => {
  test("checks the whole batch and reports a reason per rejected file", async () => {
    const good = createFile("intro.mp3", "audio/mpeg")
    const sidecar = createAppleDoubleFile("._intro.mp3", "audio/mpeg")
    const wrongKind = createFile("sermon.mp4", "video/mp4")

    const { acceptedFiles, rejections } = await checkBroadcastFiles([sidecar, good, wrongKind], "audio")

    expect(acceptedFiles).toEqual([good])
    expect(rejections).toHaveLength(2)
    expect(rejections[0].file).toBe(sidecar)
    expect(rejections[0].reason).toContain("macOS sidecar file")
    expect(rejections[1].file).toBe(wrongKind)
    expect(rejections[1].reason).toBe("Unsupported file type.")
  })
})
