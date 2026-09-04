import { describe, expect, test } from "bun:test"
import { findCoverBounds, isCropped } from "./cover-crop"

type Rgba = [number, number, number, number]

const BLACK: Rgba = [0, 0, 0, 255]
const RED: Rgba = [220, 40, 40, 255]

function createImage(width: number, height: number, paint: (x: number, y: number) => Rgba): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y)
      const offset = (y * width + x) * 4
      pixels[offset] = r
      pixels[offset + 1] = g
      pixels[offset + 2] = b
      pixels[offset + 3] = a
    }
  }

  return pixels
}

// A 16:9 frame padded into a square, which is the shape of the covers embedded
// in the sample playlist.
function letterboxed(width: number, height: number, barHeight: number) {
  return createImage(width, height, (x, y) => (y < barHeight || y >= height - barHeight ? BLACK : RED))
}

describe("findCoverBounds", () => {
  test("trims flat bars above and below the artwork", () => {
    const pixels = letterboxed(100, 100, 20)

    expect(findCoverBounds(pixels, 100, 100)).toEqual({ height: 60, width: 100, x: 0, y: 20 })
  })

  test("trims pillar bars on the left and right", () => {
    const pixels = createImage(100, 100, (x) => (x < 15 || x >= 85 ? BLACK : RED))

    expect(findCoverBounds(pixels, 100, 100)).toEqual({ height: 100, width: 70, x: 15, y: 0 })
  })

  test("leaves an edge-to-edge cover untouched", () => {
    const pixels = createImage(100, 100, () => RED)
    const bounds = findCoverBounds(pixels, 100, 100)

    expect(bounds).toEqual({ height: 100, width: 100, x: 0, y: 0 })
    expect(isCropped(bounds, 100, 100)).toBe(false)
  })

  test("leaves a wholly uniform image alone rather than cropping to the cap", () => {
    const pixels = createImage(100, 100, () => BLACK)

    expect(findCoverBounds(pixels, 100, 100)).toEqual({ height: 100, width: 100, x: 0, y: 0 })
  })

  test("never trims more than a third off an edge", () => {
    const pixels = createImage(100, 100, (x, y) => (y < 60 ? BLACK : RED))
    const bounds = findCoverBounds(pixels, 100, 100)

    expect(bounds.y).toBe(35)
  })

  test("keeps a bar that is not uniform", () => {
    const pixels = createImage(100, 100, (x, y) => (y < 20 && x >= 40 && x < 60 ? RED : y < 20 ? BLACK : RED))

    expect(findCoverBounds(pixels, 100, 100).y).toBe(0)
  })

  test("tolerates slight noise within a bar", () => {
    const pixels = letterboxed(100, 100, 20)
    pixels[(5 * 100 + 30) * 4] = 8

    expect(findCoverBounds(pixels, 100, 100).y).toBe(20)
  })

  test("returns the full frame for empty or short pixel data", () => {
    expect(findCoverBounds(new Uint8ClampedArray(0), 0, 0)).toEqual({ height: 0, width: 0, x: 0, y: 0 })
    expect(findCoverBounds(new Uint8ClampedArray(16), 100, 100)).toEqual({ height: 100, width: 100, x: 0, y: 0 })
  })

  test("reports a crop only when the bounds actually changed", () => {
    expect(isCropped({ height: 60, width: 100, x: 0, y: 20 }, 100, 100)).toBe(true)
    expect(isCropped({ height: 100, width: 100, x: 0, y: 0 }, 100, 100)).toBe(false)
  })
})
