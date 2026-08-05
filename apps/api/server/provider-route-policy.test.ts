import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { authorizeProviderRoute, ProviderRouteError, type ProviderRouteRule } from "./provider-route-policy.js"

const ROUTE_PREFIX = "/api/provider/v3"
const ROUTES: readonly ProviderRouteRule[] = [
  { method: "GET", path: /^\/categories$/, query: ["part", "region"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/resources\/[A-Za-z0-9_-]+$/, query: [], permission: "can_read", body: "none", maxBodyBytes: 0 },
]

describe("authorizeProviderRoute", () => {
  it("authorizes a provider path from the request URL", () => {
    const route = authorizeProviderRoute(
      "GET",
      "/api/provider/v3/categories?part=snippet&region=US&path=categories",
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

  it("rejects requests outside the provider route prefix", () => {
    assert.throws(
      () => authorizeProviderRoute("GET", "/api/other/v3/categories", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider operation is not allowed"),
    )
  })

  it("rejects disallowed or repeated query parameters", () => {
    assert.throws(
      () => authorizeProviderRoute("GET", "/api/provider/v3/categories?unexpected=true", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider query is not allowed"),
    )
    assert.throws(
      () => authorizeProviderRoute("GET", "/api/provider/v3/categories?part=snippet&part=id", ROUTE_PREFIX, ROUTES),
      new ProviderRouteError("Provider query is not allowed"),
    )
  })
})
