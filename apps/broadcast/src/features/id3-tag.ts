export type Id3Picture = {
  data: Uint8Array
  mimeType: string
}

export type Id3Tag = {
  artist: string | null
  picture: Id3Picture | null
  title: string | null
}

const HEADER_SIZE = 10
const EMPTY_TAG: Id3Tag = { artist: null, picture: null, title: null }

function readSynchsafe(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14) | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]
}

/**
 * Total byte length of the leading ID3v2 tag, header included, or null when the
 * bytes do not start with one. Reading this from the first few bytes tells a
 * caller exactly how much of the file it has to fetch to get the whole tag.
 */
export function readId3TagLength(bytes: Uint8Array): number | null {
  if (bytes.length < HEADER_SIZE) return null
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null

  return HEADER_SIZE + readSynchsafe(bytes, 6)
}

function decodeText(encoding: number, body: Uint8Array): string {
  const label = encoding === 1 ? "utf-16" : encoding === 2 ? "utf-16be" : encoding === 3 ? "utf-8" : "latin1"

  return new TextDecoder(label).decode(body).replace(/\0+$/, "")
}

function indexOfTerminator(bytes: Uint8Array, start: number): number {
  for (let index = start; index < bytes.length; index += 1) {
    if (bytes[index] === 0) return index
  }

  return bytes.length
}

function parsePicture(body: Uint8Array): Id3Picture | null {
  if (body.length < 4) return null

  const mimeEnd = indexOfTerminator(body, 1)
  const mimeType = decodeText(0, body.subarray(1, mimeEnd))
  // encoding byte, mime + terminator, picture type byte, then the description.
  const descriptionStart = mimeEnd + 2
  const descriptionEnd = indexOfTerminator(body, descriptionStart)
  const data = body.subarray(descriptionEnd + 1)

  if (!mimeType.startsWith("image/") || data.length === 0) return null

  return { data, mimeType }
}

/**
 * Reads title, artist and embedded cover art out of an ID3v2.3 or ID3v2.4 tag.
 * The much older v2.2 frame layout and unsynchronised tags are not handled —
 * those report as absent metadata rather than being guessed at.
 */
export function parseId3Tag(bytes: Uint8Array): Id3Tag {
  const tagLength = readId3TagLength(bytes)
  const version = bytes[3]

  if (tagLength === null || version < 3) return EMPTY_TAG
  if ((bytes[5] & 0x80) !== 0) return EMPTY_TAG

  const tag: Id3Tag = { ...EMPTY_TAG }
  const end = Math.min(tagLength, bytes.length)
  let position = HEADER_SIZE

  while (position + HEADER_SIZE <= end) {
    const frameId = decodeText(0, bytes.subarray(position, position + 4))

    if (!/^[A-Z0-9]{4}$/.test(frameId)) break

    const frameSize = version >= 4 ? readSynchsafe(bytes, position + 4) : readUint32(bytes, position + 4)
    const bodyStart = position + HEADER_SIZE
    const body = bytes.subarray(bodyStart, Math.min(bodyStart + frameSize, end))

    if (frameSize <= 0) break

    if (frameId === "TIT2") tag.title = decodeText(body[0], body.subarray(1)) || null
    if (frameId === "TPE1") tag.artist = decodeText(body[0], body.subarray(1)) || null
    if (frameId === "APIC") tag.picture = parsePicture(body)

    position = bodyStart + frameSize
  }

  return tag
}
