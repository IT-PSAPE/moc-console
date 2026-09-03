import { describe, expect, test } from "bun:test"
import { getNextPlaybackIndex, getPreloadIndices } from "./playback-sequence"

describe("getNextPlaybackIndex", () => {
  test("advances to the next item while there is another item to play", () => {
    expect(getNextPlaybackIndex(3, 0, true)).toBe(1)
    expect(getNextPlaybackIndex(3, 1, false)).toBe(2)
  })

  test("wraps to the start when looping is enabled", () => {
    expect(getNextPlaybackIndex(3, 2, true)).toBe(0)
  })

  test("stops at the end when looping is disabled", () => {
    expect(getNextPlaybackIndex(3, 2, false)).toBeNull()
    expect(getNextPlaybackIndex(0, 0, true)).toBeNull()
  })
})

describe("getPreloadIndices", () => {
  test("returns the configured number of upcoming items", () => {
    expect(getPreloadIndices(4, 1, 2, false)).toEqual([2, 3])
  })

  test("wraps preloads when looping is enabled", () => {
    expect(getPreloadIndices(3, 2, 2, true)).toEqual([0, 1])
  })

  test("never duplicates the active item when the list is shorter than the preload count", () => {
    expect(getPreloadIndices(2, 0, 3, true)).toEqual([1])
  })
})
