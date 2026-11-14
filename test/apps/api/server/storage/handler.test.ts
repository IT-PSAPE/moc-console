import { describe, expect, test, vi } from "vitest"
import type { QueryResultRow } from "pg"
import { runWithSqlFixture, setSqlFixture } from "../sql-fixture.js"
import type { ApiRequest, ApiResponse } from "../../../../../apps/api/server/http"

const queryTexts: string[] = []
let linkedToBroadcast = false
let objectOwner = "22222222-2222-4222-8222-222222222222"

const { handleStorageRequest } = await import("../../../../../apps/api/server/storage/handler")

function setStorageSqlFixture(): void {
  const query = async (sql: string): Promise<QueryResultRow[]> => {
    queryTexts.push(sql)
    if (sql.includes("FROM moc_private.storage_objects object")) {
      return [{
        content_type: "image/png",
        byte_size: 3,
        sha256: "a".repeat(64),
        owner_user_id: objectOwner,
        workspace_id: "33333333-3333-4333-8333-333333333333",
        public_broadcast_item: linkedToBroadcast,
        shares_profile_workspace: false,
        is_workspace_member: false,
      }]
    }
    return []
  }
  setSqlFixture({ queryRows: query, queryActor: query })
}

const mediaReader = {
  getStorageObject: async () => ({ Body: null }),
  headStorageObject: async () => ({ ContentLength: 3, ETag: "\"etag\"", LastModified: new Date("2026-10-04T00:00:00.000Z") }),
}

const workspaceId = "33333333-3333-4333-8333-333333333333"
const userId = "44444444-4444-4444-8444-444444444444"
const quoteImagePath = "moc-uploads/workspace/owner/daily-quote-images/field.png"

async function withStorageSession(work: () => Promise<void>): Promise<void> {
  vi.stubEnv("ALLOWED_ORIGINS", "https://console.example.test")
  vi.stubEnv("MOC_CONSOLE_ORIGIN", "https://console.example.test")
  vi.stubEnv("MOC_AUTH_TRUSTED_ORIGINS", "https://console.example.test")
  vi.stubEnv("NEON_AUTH_FUNCTION_URL", "https://auth.example.test")
  vi.stubEnv("MOC_AUTH_SERVICE_SECRET", "storage-test-secret")
  vi.stubEnv("AWS_ACCESS_KEY_ID", "storage-test-id")
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "storage-test-secret")
  vi.stubGlobal("fetch", async () => Response.json({ session: { id: "session" }, user: { id: userId, email: "viewer@example.test" } }))
  try {
    await runWithSqlFixture(work)
  } finally {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  }
}

function responseCapture() {
  const headers = new Map<string, string | string[]>()
  let status = 200
  let body: unknown
  let ended = false
  const response = {
    status(code: number) { status = code; return this },
    json(value: unknown) { body = value },
    setHeader(name: string, value: string | string[]) { headers.set(name, value) },
    end() { ended = true },
    write() { return true },
    once() { return this },
    get statusCode() { return status },
    set statusCode(code: number) { status = code },
  }
  return { response: response as unknown as ApiResponse & { statusCode: number; write: (chunk: Uint8Array) => boolean; once: (event: "drain", listener: () => void) => unknown; end: () => void }, headers, get status() { return status }, get body() { return body }, get ended() { return ended } }
}

describe("storage media handler authorization", () => {
  test.each([
    { method: "POST", url: "/api/storage/uploads" },
    { method: "GET", url: "/api/storage/uploads/22222222-2222-4222-8222-222222222222" },
    { method: "DELETE", url: "/api/storage/objects/avatars" },
  ])("returns a sign-in-required response for unauthenticated $method $url", async ({ method, url }) => {
    const savedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.test"
    try {
      const target = responseCapture()
      await handleStorageRequest({ method, url, headers: { origin: "https://console.example.test" } } as ApiRequest & AsyncIterable<Uint8Array | string>, target.response, mediaReader)
      expect(target.status).toBe(401)
      expect(target.body).toMatchObject({ error: { code: "unauthenticated", message: "Sign in required" } })
    } finally {
      if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS
      else process.env.ALLOWED_ORIGINS = savedOrigins
    }
  })

  test("rejects a foreign origin on cookie-authenticated mutation routes before authentication", async () => {
    const savedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.test"
    try {
      const target = responseCapture()
      await handleStorageRequest({ method: "POST", url: "/api/storage/uploads", headers: { origin: "https://attacker.example.test" } } as ApiRequest & AsyncIterable<Uint8Array | string>, target.response, mediaReader)

      expect(target.status).toBe(403)
      expect((target.body as { error: { code: string } }).error.code).toBe("forbidden_origin")
    } finally {
      if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS
      else process.env.ALLOWED_ORIGINS = savedOrigins
    }
  })

  test("supports an allowed upload preflight with the binary upload headers", async () => {
    const savedOrigins = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = "https://console.example.test"
    try {
      const target = responseCapture()
      await handleStorageRequest({
        method: "OPTIONS",
        url: "/api/storage/uploads/example/chunks/0",
        headers: { origin: "https://console.example.test", "access-control-request-method": "PUT" },
      } as ApiRequest & AsyncIterable<Uint8Array | string>, target.response, mediaReader)

      expect(target.status).toBe(204)
      expect(target.headers.get("Access-Control-Allow-Origin")).toBe("https://console.example.test")
      expect(target.headers.get("Access-Control-Allow-Headers")).toContain("content-type")
      expect(target.headers.get("Access-Control-Allow-Headers")).toContain("x-moc-workspace")
    } finally {
      if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS
      else process.env.ALLOWED_ORIGINS = savedOrigins
    }
  })

  test("checks quote-management permission rather than general create permission for image uploads", async () => {
    await withStorageSession(async () => {
      let canManage = false
      const query = vi.fn(async (sql: string): Promise<QueryResultRow[]> => {
        if (sql.includes("public.workspace_users wu")) return [{ allowed: sql.includes("r.can_manage_roles = true") && canManage }]
        return []
      })
      setSqlFixture({ queryRows: query })
      const request = {
        method: "POST",
        url: "/api/storage/uploads",
        headers: { cookie: "session=test", origin: "https://console.example.test", "x-moc-workspace": workspaceId },
        body: { workspaceId, purpose: "quote-image", size: 32, contentType: "image/webp", fileName: "field.webp" },
      } as ApiRequest & AsyncIterable<Uint8Array | string>
      const denied = responseCapture()
      await handleStorageRequest(request, denied.response, mediaReader)
      expect(denied.status).toBe(403)
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO moc_private.storage_uploads"), expect.anything())

      canManage = true
      const allowed = responseCapture()
      await handleStorageRequest(request, allowed.response, mediaReader)
      expect(allowed.status).toBe(201)
      expect(allowed.body).toMatchObject({ bucket: "media", path: expect.stringContaining(`${workspaceId}/${userId}/daily-quote-images/`) })
    })
  })

  test("blocks deletion while a quote references the image", async () => {
    await withStorageSession(async () => {
      const query = vi.fn(async (sql: string): Promise<QueryResultRow[]> => {
        if (sql.includes("r.can_manage_roles = true")) return [{ allowed: true }]
        if (sql.includes("FROM moc_private.storage_objects")) return [{ object_path: quoteImagePath, purpose: "quote-image", byte_size: 3 }]
        if (sql.includes("FROM public.daily_quotes")) return [{ "?column?": 1 }]
        return []
      })
      setSqlFixture({ queryRows: query })
      const target = responseCapture()
      await handleStorageRequest({
        method: "DELETE",
        url: "/api/storage/objects/media",
        headers: { cookie: "session=test", origin: "https://console.example.test", "x-moc-workspace": workspaceId },
        body: { workspaceId, purpose: "quote-image", paths: [quoteImagePath] },
      } as ApiRequest & AsyncIterable<Uint8Array | string>, target.response, mediaReader)

      expect(target.status).toBe(409)
      expect(query).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE"), expect.anything())
      expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM public.daily_quotes"), [workspaceId, [quoteImagePath]])
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining("DELETE FROM moc_private.storage_objects"), expect.anything())
    })
  })

  test("serves a private quote image to a workspace member through a same-origin media URL", async () => {
    await withStorageSession(async () => {
      const query = async (sql: string, values: readonly unknown[]): Promise<QueryResultRow[]> => {
        if (!sql.includes("FROM moc_private.storage_objects object")) return []
        return [{
          content_type: "image/png", byte_size: 3, sha256: "a".repeat(64),
          owner_user_id: objectOwner, workspace_id: workspaceId,
          public_broadcast_item: false, shares_profile_workspace: false, is_workspace_member: values[2] === userId,
        }]
      }
      setSqlFixture({ queryRows: query })
      const target = responseCapture()
      const request = { method: "HEAD", url: `/api/storage/media/${quoteImagePath}`, headers: { cookie: "session=test" } } as ApiRequest & AsyncIterable<Uint8Array | string>
      await handleStorageRequest(request, target.response, mediaReader)
      expect(target.status).toBe(200)
      expect(target.headers.get("Cache-Control")).toBe("private, no-store")

      const anonymous = responseCapture()
      await handleStorageRequest({ ...request, headers: {} }, anonymous.response, mediaReader)
      expect(anonymous.status).toBe(404)
    })
  })

  test("does not serve an unlinked private avatar to an anonymous caller", async () => {
    await runWithSqlFixture(async () => {
      setStorageSqlFixture()
      linkedToBroadcast = false
      objectOwner = "22222222-2222-4222-8222-222222222222"
      queryTexts.length = 0
      const target = responseCapture()

      await handleStorageRequest({ method: "HEAD", url: "/api/storage/avatars/profile/avatar.png", headers: {} } as ApiRequest & AsyncIterable<Uint8Array | string>, target.response, mediaReader)

      expect(target.status).toBe(404)
      expect((target.body as { error: { code: string } }).error.code).toBe("not_found")
      expect(queryTexts.some((sql) => sql.includes("FROM public.broadcast_items item"))).toBe(true)
      expect(target.headers.get("Location")).toBeUndefined()
    })
  })

  test("allows anonymous HEAD only when a broadcast item references the exact object", async () => {
    await runWithSqlFixture(async () => {
      setStorageSqlFixture()
      linkedToBroadcast = true
      objectOwner = "22222222-2222-4222-8222-222222222222"
      queryTexts.length = 0
      const target = responseCapture()

      await handleStorageRequest({ method: "HEAD", url: "/api/storage/broadcast-media/media/object.mp4", headers: {} } as ApiRequest & AsyncIterable<Uint8Array | string>, target.response, mediaReader)

      expect(target.status).toBe(200)
      expect(target.ended).toBe(true)
      expect(target.headers.get("Cache-Control")).toBe("public, max-age=3600")
      expect(queryTexts.some((sql) => sql.includes("item.storage_bucket = object.bucket AND item.storage_path = object.object_path"))).toBe(true)
    })
  })
})
