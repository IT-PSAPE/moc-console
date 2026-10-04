import { describe, expect, it } from "vitest"
import { authCallbackError, authCallbackOutcome, createAuthClient } from "../../../packages/sdk/src/auth.js"
import type { MocTransport } from "../../../packages/sdk/src/transport.js"

describe("MoC auth callbacks", () => {
  it("maps supported verification and recovery callbacks", () => {
    expect(authCallbackOutcome(new URL("https://console.example.test/login?auth=verified"))).toBe("verified")
    expect(authCallbackOutcome(new URL("https://console.example.test/reset-password?token=opaque"))).toBe("password-recovery")
  })

  it("ignores provider-specific OTP and PKCE callback parameters", () => {
    expect(authCallbackOutcome(new URL("https://console.example.test/login?token_hash=abc&type=signup"))).toBeNull()
    expect(authCallbackOutcome(new URL("https://console.example.test/reset-password?token_hash=abc&type=recovery"))).toBeNull()
    expect(authCallbackOutcome(new URL("https://console.example.test/login?code=legacy"))).toBeNull()
    expect(authCallbackError(new URL("https://console.example.test/login?token_hash=abc&type=signup"))).toBeNull()
  })

  it("exposes Better Auth callback errors to the login screen", () => {
    expect(authCallbackError(new URL("https://console.example.test/login?error=invalid_token&error_description=Verification%20failed")))
      .toBe("Verification failed")
    expect(authCallbackError(new URL("https://console.example.test/login?error=invalid_token"))).toBe("invalid token")
  })

  it("sends a verification email through the allowlisted auth SDK route", async () => {
    let requested: { path: string; options?: unknown } | undefined
    const transport: MocTransport = {
      async request<T>(path, options) {
        requested = { path, options }
        return null as T
      },
      async call<T>() { return null as T },
      url(path) { return path },
    }
    const result = await createAuthClient(transport).sendVerificationEmail("person@example.test", "https://console.example.test/login?auth=verified")
    expect(result.error).toBeNull()
    expect(requested).toEqual({
      path: "/api/auth/send-verification-email",
      options: { method: "POST", json: { email: "person@example.test", callbackURL: "https://console.example.test/login?auth=verified" } },
    })
  })

  it("preserves Better Auth's unverified-account error code for the resend action", async () => {
    const transport: MocTransport = {
      async request<T>(): Promise<T> { throw Object.assign(new Error("Email not verified"), { code: "EMAIL_NOT_VERIFIED" }) },
      async call<T>() { return null as T },
      url(path) { return path },
    }
    const result = await createAuthClient(transport).signIn("person@example.test", "password")
    expect(result.error?.code).toBe("EMAIL_NOT_VERIFIED")
  })
})
