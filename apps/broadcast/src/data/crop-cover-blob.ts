import { findCoverBounds, isCropped } from "@/features/cover-crop"

/**
 * Trims the flat bars off an embedded cover so the artwork fills its frame.
 * Covers pulled from video sources are commonly a 16:9 still padded into a
 * square, which `object-fit` cannot undo — the padding is in the image data.
 * Anything unsupported or unexpected returns the original blob untouched.
 */
export async function cropCoverBlob(blob: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return blob

  let bitmap: ImageBitmap | null = null

  try {
    bitmap = await createImageBitmap(blob)
    const source = new OffscreenCanvas(bitmap.width, bitmap.height)
    const sourceContext = source.getContext("2d")

    if (!sourceContext) return blob

    sourceContext.drawImage(bitmap, 0, 0)
    const { data } = sourceContext.getImageData(0, 0, bitmap.width, bitmap.height)
    const bounds = findCoverBounds(data, bitmap.width, bitmap.height)

    if (!isCropped(bounds, bitmap.width, bitmap.height)) return blob

    const cropped = new OffscreenCanvas(bounds.width, bounds.height)
    const croppedContext = cropped.getContext("2d")

    if (!croppedContext) return blob

    croppedContext.drawImage(bitmap, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
    return await cropped.convertToBlob({ type: "image/png" })
  } catch {
    return blob
  } finally {
    bitmap?.close()
  }
}
