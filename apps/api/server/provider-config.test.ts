import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ProviderConfigError, resolveOAuthConfig } from "./provider-config.js"

const ID_NAMES = ["GOOGLE_CLIENT_ID", "VITE_GOOGLE_CLIENT_ID"] as const
const SECRET_NAMES = ["GOOGLE_CLIENT_SECRET"] as const

function resolve(env: Record<string, string | undefined>) {
  return resolveOAuthConfig("Google OAuth", env, ID_NAMES, SECRET_NAMES)
}

describe("resolveOAuthConfig", () => {
  it("prefers the canonical variable and falls back to the shared one", () => {
    assert.deepEqual(resolve({ GOOGLE_CLIENT_ID: "canonical", VITE_GOOGLE_CLIENT_ID: "shared", GOOGLE_CLIENT_SECRET: "secret" }), {
      clientId: "canonical",
      clientSecret: "secret",
    })
    assert.equal(resolve({ VITE_GOOGLE_CLIENT_ID: "shared", GOOGLE_CLIENT_SECRET: "secret" }).clientId, "shared")
  })

  it("names the missing variables rather than failing anonymously", () => {
    assert.throws(
      () => resolve({ GOOGLE_CLIENT_SECRET: "secret" }),
      (error: unknown) =>
        error instanceof ProviderConfigError &&
        error.message === "Google OAuth is not configured on this deployment. Set GOOGLE_CLIENT_ID." &&
        error.missing.length === 1,
    )
    assert.throws(
      () => resolve({}),
      (error: unknown) => error instanceof ProviderConfigError && error.missing.length === 2,
    )
  })

  it("treats a blank value as unset", () => {
    assert.throws(
      () => resolve({ GOOGLE_CLIENT_ID: "   ", GOOGLE_CLIENT_SECRET: "secret" }),
      ProviderConfigError,
    )
  })
})
