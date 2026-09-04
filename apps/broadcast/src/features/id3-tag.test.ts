import { describe, expect, test } from "bun:test"
import { parseId3Tag, readId3TagLength } from "./id3-tag"

function toSynchsafe(size: number): number[] {
  return [(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f]
}

function toUint32(size: number): number[] {
  return [(size >> 24) & 0xff, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff]
}

function textFrame(id: string, encoding: number, body: number[]): number[] {
  const payload = [encoding, ...body]
  return [...[...id].map((character) => character.charCodeAt(0)), ...toUint32(payload.length), 0, 0, ...payload]
}

function latin1(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0))
}

function pictureFrame(mimeType: string, pixels: number[]): number[] {
  const payload = [0, ...latin1(mimeType), 0, 3, 0, ...pixels]
  return [...latin1("APIC"), ...toUint32(payload.length), 0, 0, ...payload]
}

function buildTag(frames: number[][], { flags = 0, version = 3 } = {}): Uint8Array {
  const body = frames.flat()
  return new Uint8Array([...latin1("ID3"), version, 0, flags, ...toSynchsafe(body.length), ...body])
}

describe("readId3TagLength", () => {
  test("reports the header plus the synchsafe payload size", () => {
    const tag = buildTag([textFrame("TIT2", 0, latin1("Kyrie"))])

    expect(readId3TagLength(tag)).toBe(tag.length)
  })

  test("returns null for bytes that do not open with an ID3v2 tag", () => {
    expect(readId3TagLength(new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0, 0, 0]))).toBeNull()
    expect(readId3TagLength(new Uint8Array([0x49, 0x44]))).toBeNull()
  })
})

describe("parseId3Tag", () => {
  test("reads title, artist and embedded cover art", () => {
    const tag = buildTag([
      textFrame("TIT2", 0, latin1("Talkin' Bout A Revolution")),
      textFrame("TPE1", 0, latin1("Tracy Chapman")),
      pictureFrame("image/png", [0x89, 0x50, 0x4e, 0x47]),
    ])

    const parsed = parseId3Tag(tag)

    expect(parsed.title).toBe("Talkin' Bout A Revolution")
    expect(parsed.artist).toBe("Tracy Chapman")
    expect(parsed.picture?.mimeType).toBe("image/png")
    expect([...(parsed.picture?.data ?? [])]).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  test("decodes UTF-16 text frames", () => {
    const utf16 = [0xff, 0xfe, 0x42, 0x00, 0x61, 0x00, 0x62, 0x00, 0x79, 0x00]
    const parsed = parseId3Tag(buildTag([textFrame("TIT2", 1, utf16)]))

    expect(parsed.title).toBe("Baby")
  })

  test("reads v2.4 frame sizes as synchsafe integers", () => {
    const title = latin1("Fast Car")
    const payload = [0, ...title]
    const frame = [...latin1("TIT2"), ...toSynchsafe(payload.length), 0, 0, ...payload]

    expect(parseId3Tag(buildTag([frame], { version: 4 })).title).toBe("Fast Car")
  })

  test("reports no metadata for unsynchronised tags rather than guessing", () => {
    const tag = buildTag([textFrame("TIT2", 0, latin1("Kyrie"))], { flags: 0x80 })

    expect(parseId3Tag(tag)).toEqual({ artist: null, picture: null, title: null })
  })

  test("reports no metadata for the older v2.2 frame layout", () => {
    const tag = buildTag([textFrame("TIT2", 0, latin1("Kyrie"))], { version: 2 })

    expect(parseId3Tag(tag)).toEqual({ artist: null, picture: null, title: null })
  })

  test("ignores a picture frame that carries no image", () => {
    const parsed = parseId3Tag(buildTag([pictureFrame("text/plain", [0x61])]))

    expect(parsed.picture).toBeNull()
  })

  test("stops at padding instead of reading past the frames", () => {
    const tag = buildTag([textFrame("TPE1", 0, latin1("Sade")), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]])

    expect(parseId3Tag(tag).artist).toBe("Sade")
  })
})
