import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it } from "vitest"

const VERCEL_FUNCTION_LIMIT = 12

describe("Vercel API function budget", () => {
  it("keeps the API within the deployment plan's function limit", () => {
    const apiDirectory = fileURLToPath(new URL("../../../../apps/api/api", import.meta.url))
    const functionFiles = readdirSync(apiDirectory, { recursive: true })
      .filter((path) => typeof path === "string" && path.endsWith(".ts") && !path.endsWith(".test.ts"))

    assert.ok(
      functionFiles.length <= VERCEL_FUNCTION_LIMIT,
      `Expected at most ${VERCEL_FUNCTION_LIMIT} API functions, found ${functionFiles.length}`,
    )
  })

  it("keeps body parsing disabled for uploads and preserves SSE/media limits", () => {
    const apiDirectory = fileURLToPath(new URL("../../../../apps/api/api", import.meta.url))
    const config = JSON.parse(readFileSync(new URL("../../../../apps/api/vercel.json", import.meta.url), "utf8")) as {
      crons?: unknown[]
      functions?: Record<string, { maxDuration?: number }>
      rewrites?: Array<{ source: string; destination: string }>
    }
    const storageEntrypoint = readFileSync(`${apiDirectory}/storage/[...path].ts`, "utf8")

    assert.match(storageEntrypoint, /bodyParser:\s*false/)
    assert.equal(config.functions?.["api/storage/[...path].ts"]?.maxDuration, 60)
    assert.equal(config.functions?.["api/public/broadcasts/[id]/events.ts"]?.maxDuration, 60)
    assert.equal(config.functions?.["api/youtube/[...path].ts"]?.maxDuration, 60)
    assert.equal(config.functions?.["api/zoom/[...path].ts"]?.maxDuration, 60)
    assert.equal(config.crons, undefined)
    assert.ok(config.rewrites?.some(({ source, destination }) => source === "/api/youtube/v3/(.*)" && destination.startsWith("/api/youtube/v3/_proxy")))
    assert.ok(config.rewrites?.some(({ source, destination }) => source === "/api/zoom/v2/(.*)" && destination.startsWith("/api/zoom/v2/_proxy")))
  })
})
