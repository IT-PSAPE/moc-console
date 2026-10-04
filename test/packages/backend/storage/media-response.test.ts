import { describe, expect, test } from "bun:test"
import { resolveMediaResponse } from "../../../../packages/backend/src/storage/media-response"

const defaults = {
  size: 100,
  etag: '"etag-1"',
  lastModified: new Date("2026-10-04T12:00:00.000Z"),
  ifNoneMatch: null,
  ifModifiedSince: null,
  range: null,
  ifRange: null,
}

describe("storage media response planning", () => {
  test("returns correct GET and HEAD responses for a bounded range", () => {
    expect(resolveMediaResponse({ ...defaults, method: "GET", range: "bytes=10-19" })).toEqual({
      status: 206, range: { start: 10, end: 19 }, contentRange: "bytes 10-19/100", contentLength: 10,
    })
    expect(resolveMediaResponse({ ...defaults, method: "HEAD", range: "bytes=90-" })).toEqual({
      status: 206, range: { start: 90, end: 99 }, contentRange: "bytes 90-99/100", contentLength: 10,
    })
    expect(resolveMediaResponse({ ...defaults, method: "HEAD" })).toEqual({
      status: 200, range: null, contentRange: null, contentLength: 100,
    })
  })

  test("returns 416 with an unsatisfied Content-Range for invalid or out-of-bounds ranges", () => {
    expect(resolveMediaResponse({ ...defaults, method: "GET", range: "bytes=100-" })).toEqual({
      status: 416, range: null, contentRange: "bytes */100", contentLength: 0,
    })
  })

  test("applies validators and ignores a range when If-Range does not match", () => {
    expect(resolveMediaResponse({ ...defaults, method: "GET", ifNoneMatch: 'W/"etag-1"' }).status).toBe(304)
    expect(resolveMediaResponse({ ...defaults, method: "GET", range: "bytes=1-2", ifRange: '"old-etag"' })).toEqual({
      status: 200, range: null, contentRange: null, contentLength: 100,
    })
    expect(resolveMediaResponse({ ...defaults, method: "GET", ifModifiedSince: "Sun, 04 Oct 2026 12:00:00 GMT" }).status).toBe(304)
  })
})
