import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const VERCEL_FUNCTION_LIMIT = 12

describe("Vercel API function budget", () => {
  it("keeps the API within the deployment plan's function limit", () => {
    const apiDirectory = fileURLToPath(new URL("../api", import.meta.url))
    const functionFiles = readdirSync(apiDirectory, { recursive: true })
      .filter((path) => typeof path === "string" && path.endsWith(".ts") && !path.endsWith(".test.ts"))

    assert.ok(
      functionFiles.length <= VERCEL_FUNCTION_LIMIT,
      `Expected at most ${VERCEL_FUNCTION_LIMIT} API functions, found ${functionFiles.length}`,
    )
  })
})
