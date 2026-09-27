import { describe, expect, test } from "bun:test"
import { parseMiniAppResponse } from "./telegram-mini-app"

describe("parseMiniAppResponse", () => {
  test("passes through a well-formed success", () => {
    const body = { ok: true, viewer: { userId: "u", name: "Craig", canUpdate: true }, detail: { kind: "checklist" } }
    expect(parseMiniAppResponse(200, body)).toBe(body as never)
  })

  test("keeps a known error code", () => {
    expect(parseMiniAppResponse(403, { ok: false, error: "not_linked", message: "Link first" })).toEqual({ ok: false, error: "not_linked", message: "Link first" })
  })

  test("maps rate-limit and unknown shapes to invalid", () => {
    expect(parseMiniAppResponse(429, { code: "rate_limited", error: "Too many requests" })).toEqual({ ok: false, error: "invalid", message: "Too many taps — wait a moment and try again." })
    expect(parseMiniAppResponse(405, { error: "Method not allowed" }).ok).toBe(false)
    expect(parseMiniAppResponse(500, null)).toMatchObject({ ok: false, error: "invalid" })
  })
})
