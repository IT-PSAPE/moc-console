import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { resolveZoomRedirectUri, ZoomRedirectUriError } from "./zoom-oauth.js"

describe("resolveZoomRedirectUri", () => {
  it("uses the exact HTTPS callback configured on the API deployment", () => {
    const redirectUri = "https://console.example.com/account/settings"
    assert.equal(resolveZoomRedirectUri({ ZOOM_REDIRECT_URI: redirectUri }), redirectUri)
  })

  it("rejects missing or non-HTTPS callback configuration", () => {
    assert.throws(() => resolveZoomRedirectUri({}), ZoomRedirectUriError)
    assert.throws(() => resolveZoomRedirectUri({ ZOOM_REDIRECT_URI: "http://localhost:5173" }), ZoomRedirectUriError)
  })
})
