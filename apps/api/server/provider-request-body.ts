export type ProviderBodyKind = "none" | "json" | "binary" | "image"

export type PreparedProviderBody = {
  body: Buffer | undefined
  /**
   * Content type to send upstream when the route decides it rather than the
   * caller — an image arriving inside a JSON envelope, for instance, must not
   * reach the provider labelled `application/json`.
   */
  contentType: string | null
}

export class ProviderRouteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderRouteError"
  }
}

/** What YouTube documents thumbnails.set as accepting. */
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "application/octet-stream"])

function isEmptyProviderBody(body: unknown): boolean {
  if (body === undefined || body === null || body === "") return true
  if (Buffer.isBuffer(body)) return body.byteLength === 0
  // A request that declares `Content-Type: application/json` but carries no
  // payload is parsed by the runtime into an empty object, so bodyless methods
  // arrive here as `{}` rather than as nothing at all.
  if (typeof body === "object") return Object.keys(body).length === 0
  return false
}

function withinLimit(body: Buffer, maxBodyBytes: number): Buffer {
  if (body.byteLength === 0) throw new ProviderRouteError("Provider request body is required")
  if (body.byteLength > maxBodyBytes) throw new ProviderRouteError("Provider request body is too large")
  return body
}

function decodeBase64Image(image: string, maxBodyBytes: number): Buffer {
  // A base64 payload expands each three decoded bytes to four encoded bytes.
  // Bound the encoded form before decoding so malformed or oversized envelopes
  // cannot allocate more than this route permits.
  const maxEncodedBytes = Math.ceil(maxBodyBytes / 3) * 4
  if (image.length > maxEncodedBytes) throw new ProviderRouteError("Provider request body is too large")
  if (image.length % 4 !== 0) throw new ProviderRouteError("Thumbnail image could not be read")

  const decoded = Buffer.from(image, "base64")
  // Buffer accepts malformed base64 by silently skipping invalid characters.
  // Re-encoding must yield exactly the source to ensure a standard, padded,
  // canonical payload arrived from the browser's FileReader.
  if (decoded.toString("base64") !== image) {
    throw new ProviderRouteError("Thumbnail image could not be read")
  }

  return withinLimit(decoded, maxBodyBytes)
}

function prepareImageBody(body: unknown, maxBodyBytes: number): PreparedProviderBody {
  if (Buffer.isBuffer(body)) {
    return { body: withinLimit(body, maxBodyBytes), contentType: null }
  }

  let envelope: unknown = body
  if (typeof body === "string") {
    try {
      envelope = JSON.parse(body)
    } catch {
      throw new ProviderRouteError("Thumbnail image could not be read")
    }
  }

  if (!envelope || typeof envelope !== "object") throw new ProviderRouteError("Thumbnail image is required")
  const { image, contentType } = envelope as { image?: unknown; contentType?: unknown }
  if (typeof image !== "string" || !image) throw new ProviderRouteError("Thumbnail image is required")

  const type = typeof contentType === "string" && contentType ? contentType : "image/jpeg"
  if (!ACCEPTED_IMAGE_TYPES.has(type)) {
    throw new ProviderRouteError(`Thumbnail must be a JPEG or PNG image (received ${type})`)
  }

  return { body: decodeBase64Image(image, maxBodyBytes), contentType: type }
}

export function prepareProviderBody(body: unknown, bodyKind: ProviderBodyKind, maxBodyBytes: number): PreparedProviderBody {
  if (bodyKind === "none") {
    if (!isEmptyProviderBody(body)) throw new ProviderRouteError("This provider operation does not accept a body")
    return { body: undefined, contentType: null }
  }

  if (bodyKind === "image") return prepareImageBody(body, maxBodyBytes)

  const prepared = Buffer.isBuffer(body)
    ? body
    : typeof body === "string"
      ? Buffer.from(body)
      : body === undefined || body === null
        ? Buffer.alloc(0)
        : Buffer.from(JSON.stringify(body))

  return { body: withinLimit(prepared, maxBodyBytes), contentType: null }
}
