import { describe, expect, test } from "bun:test"
import { publicOperationRateLimitSubject } from "../../../../../apps/api/server/platform/rate-limit"
import type { ApiRequest } from "../../../../../apps/api/server/http"

const request: ApiRequest = { headers: { "x-forwarded-for": "203.0.113.42" } }

describe("platform public operation rate limits", () => {
  test("does not create a fresh submission bucket for each caller-supplied workspace", () => {
    const first = publicOperationRateLimitSubject(request, "publicSubmissions", "submitRequest")
    const second = publicOperationRateLimitSubject(request, "publicSubmissions", "submitChecklist")

    expect(first).toBe(second)
  })

  test("keeps lookups and mutations in separate buckets", () => {
    expect(publicOperationRateLimitSubject(request, "publicSubmissions", "submitRequest"))
      .not.toBe(publicOperationRateLimitSubject(request, "publicSubmissions", "listRequestCategories"))
  })
})
