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
      assert.equal(prepareProviderBody(body, "none", 0), undefined)
    }
  })

  it("rejects a payload on a bodyless route", () => {
    assert.throws(
      () => prepareProviderBody({ part: "snippet" }, "none", 0),
      new ProviderRouteError("This provider operation does not accept a body"),
    )
  })

  it("serializes and bounds a json payload", () => {
    assert.equal(prepareProviderBody({ id: "video_1" }, "json", 1024)?.toString(), '{"id":"video_1"}')
    assert.throws(
      () => prepareProviderBody({ id: "video_1" }, "json", 4),
      new ProviderRouteError("Provider request body is too large"),
    )
    assert.throws(
      () => prepareProviderBody(undefined, "json", 1024),
      new ProviderRouteError("Provider request body is required"),
    )
  })
})
