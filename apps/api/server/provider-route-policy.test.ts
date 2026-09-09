import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { authorizeProviderRoute, prepareProviderBody, ProviderRouteError, type ProviderRouteRule } from "./provider-route-policy.js"

const ROUTE_PREFIX = "/api/provider/v3"
const ROUTES: readonly ProviderRouteRule[] = [
  { method: "GET", path: /^\/categories$/, query: ["part", "region"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/resources\/[A-Za-z0-9_-]+$/, query: [], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/resources\/bind$/, query: ["id"], permission: "can_update", body: "none", maxBodyBytes: 0 },
]

describe("authorizeProviderRoute", () => {
  it("authorizes a provider path from the request URL", () => {
    const route = authorizeProviderRoute(
      "GET",
      "/api/provider/v3/categories?part=snippet&region=US&path=categories&nxtPpath=categories",
      ROUTE_PREFIX,
      ROUTES,
    )

    assert.deepEqual(route, {
      body: "none",
      maxBodyBytes: 0,
      path: "/categories?part=snippet&region=US",
      permission: "can_read",
    })
  })

  it("supports absolute request URLs and multi-segment provider paths", () => {
    const route = authorizeProviderRoute(
      "GET",
      "https://api.example.com/api/provider/v3/resources/resource_1",
      ROUTE_PREFIX,
      ROUTES,
    )

    assert.equal(route.path, "/resources/resource_1")
  })

  it("takes the provider path from a rewritten request's parameter", () => {
    // Nested provider paths arrive rewritten onto the single-segment proxy URL,
    // because a [...path] function here is only handed one segment.
    const route = authorizeProviderRoute(
      "POST",
      "/api/provider/v3/_proxy?providerPath=resources/bind&id=abc",
      ROUTE_PREFIX,
      ROUTES,
    )

    assert.equal(route.path, "/resources/bind?id=abc")
    assert.equal(route.permission, "can_update")
  })

  it("accepts a leading slash and a placeholder pathname from the rewrite", () => {
    for (const url of [
      "/api/provider/v3/_proxy?providerPath=/resources/bind",
      "/api/provider/v3/[...path]?providerPath=resources/bind",
    ]) {
      assert.equal(authorizeProviderRoute("POST", url, ROUTE_PREFIX, ROUTES).path, "/resources/bind")
    }
  })

  it("never forwards the rewrite parameter to the provider", () => {
    const route = authorizeProviderRoute(
      "GET",
      "/api/provider/v3/categories?part=snippet&providerPath=categories",
      ROUTE_PREFIX,
      ROUTES,
    )

    assert.equal(route.path, "/categories?part=snippet")
  })

  it("survives a rewrite re-matching an already-collapsed URL", () => {
    // The caller collapsed the path, then the deployment's rewrite matched that
    // URL too and appended its own parameter naming the proxy segment. Reading
    // the wrong one turns a valid call into "operation is not allowed".
    const route = authorizeProviderRoute(
      "POST",
      "/api/provider/v3/_proxy?id=abc&providerPath=resources/bind&rewrittenPath=_proxy",
      ROUTE_PREFIX,
      ROUTES,
    )

    assert.equal(route.path, "/resources/bind?id=abc")
  })

  it("accepts the path from the rewrite alone, still encoded", () => {
    for (const url of [
      "/api/provider/v3/_proxy?rewrittenPath=resources/bind",
      "/api/provider/v3/_proxy?rewrittenPath=resources%2Fbind",
      "/api/provider/v3/_proxy?providerPath=resources%2Fbind",
    ]) {
      assert.equal(authorizeProviderRoute("POST", url, ROUTE_PREFIX, ROUTES).path, "/resources/bind", url)
    }
  })

  it("ignores a parameter that only names the proxy segment", () => {
    assert.throws(
      () => authorizeProviderRoute("POST", "/api/provider/v3/_proxy?providerPath=_proxy", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider operation is not allowed"),
    )
  })

  it("rejects a rewritten request with no provider path", () => {
    assert.throws(
      () => authorizeProviderRoute("POST", "/api/provider/v3/_proxy?id=abc", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider operation is not allowed"),
    )
  })

  it("holds a rewritten path to the same rules as a direct one", () => {
    assert.throws(
      () => authorizeProviderRoute("GET", "/api/provider/v3/_proxy?providerPath=../secrets", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider operation is not allowed"),
    )
    assert.throws(
      () => authorizeProviderRoute("DELETE", "/api/provider/v3/_proxy?providerPath=resources/bind", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider operation is not allowed"),
    )
  })

  it("rejects requests outside the provider route prefix", () => {
    assert.throws(
      () => authorizeProviderRoute("GET", "/api/other/v3/categories", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider operation is not allowed"),
    )
  })

  it("drops query parameters outside the rule allow-list", () => {
    const route = authorizeProviderRoute(
      "GET",
      "/api/provider/v3/categories?part=snippet&unexpected=true",
      ROUTE_PREFIX,
      ROUTES,
    )

    assert.equal(route.path, "/categories?part=snippet")
  })

  it("rejects repeated query parameters", () => {
    assert.throws(
      () => authorizeProviderRoute("GET", "/api/provider/v3/categories?part=snippet&part=id", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider query is not allowed"),
    )
  })
})

describe("prepareProviderBody", () => {
  it("accepts an empty payload on a bodyless route", () => {
    for (const body of [undefined, null, "", {}, Buffer.alloc(0)]) {
      assert.deepEqual(prepareProviderBody(body, "none", 0), { body: undefined, contentType: null })
    }
  })

  it("rejects a payload on a bodyless route", () => {
    assert.throws(
      () => prepareProviderBody({ part: "snippet" }, "none", 0),
      new ProviderRouteError("This provider operation does not accept a body"),
    )
  })

  it("serializes and bounds a json payload", () => {
    assert.equal(prepareProviderBody({ id: "video_1" }, "json", 1024).body?.toString(), '{"id":"video_1"}')
    assert.throws(
      () => prepareProviderBody({ id: "video_1" }, "json", 4),
      new ProviderRouteError("Provider request body is too large"),
    )
    assert.throws(
      () => prepareProviderBody(undefined, "json", 1024),
      new ProviderRouteError("Provider request body is required"),
    )
  })

  it("decodes an image envelope back to the exact bytes sent", () => {
    // A JPEG's magic number: proof the bytes survive the round trip, which is
    // the whole point of encoding them instead of posting a raw binary body.
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const prepared = prepareProviderBody(
      { image: bytes.toString("base64"), contentType: "image/png" },
      "image",
      1024,
    )

    assert.deepEqual(prepared.body, bytes)
    // The provider must see the image type, never the envelope's own.
    assert.equal(prepared.contentType, "image/png")
  })

  it("accepts a stringified envelope and raw bytes alike", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff])
    assert.deepEqual(
      prepareProviderBody(JSON.stringify({ image: bytes.toString("base64") }), "image", 1024).body,
      bytes,
    )
    const raw = prepareProviderBody(bytes, "image", 1024)
    assert.deepEqual(raw.body, bytes)
    assert.equal(raw.contentType, null, "raw bytes keep the caller's content type")
  })

  it("refuses an image the provider would reject anyway", () => {
    const image = Buffer.from([0xff, 0xd8, 0xff]).toString("base64")
    assert.throws(
      () => prepareProviderBody({ image, contentType: "image/gif" }, "image", 1024),
      new ProviderRouteError("Thumbnail must be a JPEG or PNG image (received image/gif)"),
    )
    assert.throws(
      () => prepareProviderBody({ contentType: "image/jpeg" }, "image", 1024),
      new ProviderRouteError("Thumbnail image is required"),
    )
    assert.throws(
      () => prepareProviderBody({ image }, "image", 2),
      new ProviderRouteError("Provider request body is too large"),
    )
  })

  it("refuses malformed or non-canonical image base64", () => {
    for (const image of ["%%%", "YQ", "YR==", "YWJj\n"]) {
      assert.throws(
        () => prepareProviderBody({ image, contentType: "image/jpeg" }, "image", 1024),
        new ProviderRouteError("Thumbnail image could not be read"),
      )
    }
  })

  it("bounds the decoded image, not the encoded envelope", () => {
    // Base64 inflates by a third; limiting the encoded form would reject images
    // YouTube's own 2 MB limit accepts.
    const bytes = Buffer.alloc(1000, 0xab)
    const encoded = bytes.toString("base64")
    assert.ok(encoded.length > bytes.byteLength)
    assert.equal(prepareProviderBody({ image: encoded }, "image", 1000).body?.byteLength, 1000)
  })
})
