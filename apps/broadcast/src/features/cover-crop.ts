export type CoverBounds = {
  height: number
  width: number
  x: number
  y: number
}

const CHANNEL_TOLERANCE = 12
// A padded 16:9 frame inside a square loses ~14% off each edge; beyond a third
// the band is more likely part of the artwork than a letterbox bar.
const MAX_TRIM_RATIO = 0.35
// Below this share of the original, the "bars" were almost certainly the
// artwork itself, so the cover is left alone.
const MIN_KEPT_AREA_RATIO = 0.25
const SAMPLE_STEP = 3

function offsetOf(width: number, x: number, y: number): number {
  return (y * width + x) * 4
}

function matchesReference(pixels: Uint8ClampedArray, offset: number, reference: number): boolean {
  return Math.abs(pixels[offset] - pixels[reference]) <= CHANNEL_TOLERANCE
    && Math.abs(pixels[offset + 1] - pixels[reference + 1]) <= CHANNEL_TOLERANCE
    && Math.abs(pixels[offset + 2] - pixels[reference + 2]) <= CHANNEL_TOLERANCE
    && Math.abs(pixels[offset + 3] - pixels[reference + 3]) <= CHANNEL_TOLERANCE
}

function isUniformRow(pixels: Uint8ClampedArray, width: number, y: number, reference: number): boolean {
  for (let x = 0; x < width; x += SAMPLE_STEP) {
    if (!matchesReference(pixels, offsetOf(width, x, y), reference)) return false
  }

  return true
}

function isUniformColumn(pixels: Uint8ClampedArray, width: number, height: number, x: number, reference: number): boolean {
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    if (!matchesReference(pixels, offsetOf(width, x, y), reference)) return false
  }

  return true
}

/**
 * Finds the artwork inside a cover that has been padded with flat bars — the
 * shape a 16:9 video thumbnail takes when it is squared off for an ID3 tag.
 * Bars are only trimmed while they stay uniform and within MAX_TRIM_RATIO, so a
 * cover that is genuinely edge-to-edge comes back unchanged.
 */
export function findCoverBounds(pixels: Uint8ClampedArray, width: number, height: number): CoverBounds {
  const full = { height, width, x: 0, y: 0 }

  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) return full

  const maxVertical = Math.floor(height * MAX_TRIM_RATIO)
  const maxHorizontal = Math.floor(width * MAX_TRIM_RATIO)
  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1

  // Each edge is compared against the corner it starts from — the bar colour —
  // so a uniform band of artwork does not read as more border to remove.
  const topReference = offsetOf(width, 0, 0)
  const bottomReference = offsetOf(width, 0, height - 1)
  const leftReference = offsetOf(width, 0, 0)
  const rightReference = offsetOf(width, width - 1, 0)

  while (top < maxVertical && isUniformRow(pixels, width, top, topReference)) top += 1
  while (height - 1 - bottom < maxVertical && isUniformRow(pixels, width, bottom, bottomReference)) bottom -= 1
  while (left < maxHorizontal && isUniformColumn(pixels, width, height, left, leftReference)) left += 1
  while (width - 1 - right < maxHorizontal && isUniformColumn(pixels, width, height, right, rightReference)) right -= 1

  const croppedWidth = right - left + 1
  const croppedHeight = bottom - top + 1

  if (croppedWidth <= 0 || croppedHeight <= 0) return full
  if (croppedWidth * croppedHeight < width * height * MIN_KEPT_AREA_RATIO) return full

  return { height: croppedHeight, width: croppedWidth, x: left, y: top }
}

export function isCropped(bounds: CoverBounds, width: number, height: number): boolean {
  return bounds.width !== width || bounds.height !== height
}
