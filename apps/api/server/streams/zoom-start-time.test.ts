import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizeZoomStartTime } from "./zoom-start-time.js"

describe("normalizeZoomStartTime", () => {
  it("keeps an instant Zoom already qualified with an offset", () => {
    assert.equal(normalizeZoomStartTime(null, "UTC"), null)
    assert.equal(normalizeZoomStartTime("2026-08-05T12:00:00Z", "Africa/Harare"), "2026-08-05T12:00:00.000Z")
    assert.equal(normalizeZoomStartTime("2026-08-05T14:00:00+02:00", "Africa/Harare"), "2026-08-05T12:00:00.000Z")
  })

  it("resolves wall-clock time through the meeting's own timezone", () => {
    assert.equal(normalizeZoomStartTime("2026-08-05T14:00:00", "Africa/Harare"), "2026-08-05T12:00:00.000Z")
  })

  it("settles a DST-aware zone against the instant it resolves to", () => {
    // Same wall-clock time, six months apart: -04:00 in July, -05:00 in January.
    assert.equal(normalizeZoomStartTime("2026-07-15T09:00:00", "America/New_York"), "2026-07-15T13:00:00.000Z")
    assert.equal(normalizeZoomStartTime("2026-01-15T09:00:00", "America/New_York"), "2026-01-15T14:00:00.000Z")
  })

  it("falls back to UTC rather than throwing mid-sweep", () => {
    assert.equal(normalizeZoomStartTime("2026-08-05T12:00:00", "Mars/Olympus_Mons"), "2026-08-05T12:00:00.000Z")
    assert.equal(normalizeZoomStartTime("not a date", "UTC"), null)
  })
})
