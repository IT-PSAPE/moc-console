import { describe, expect, it } from "vitest"
import { authCallbackError, createAuthClient } from "../../../packages/sdk/src/auth.js"
import type { MocTransport } from "../../../packages/sdk/src/transport.js"

describe("MoC Google auth", () => {
  it("reads provider errors from query and hash callbacks", () => {
    expect(authCallbackError(new URL("https://console.example.test/login?error=invitation_required"))).toBe("invitation required")
    expect(authCallbackError(new URL("https://console.example.test/login#error_description=Google%20is%20unavailable"))).toBe("Google is unavailable")
    expect(authCallbackError(new URL("https://console.example.test/login?code=opaque"))).toBeNull()
  })

  it("requests Google social sign-in without redirecting the browser", async () => {
    let requested: { path: string; options?: unknown } | undefined
    const transport: MocTransport = {
      async request<T>(path, options) {
        requested = { path, options }
        return { url: "https://accounts.google.test/authorize" } as T
      },
      async call<T>() { return null as T },
      url(path) { return path },
    }
    const result = await createAuthClient(transport).signInWithGoogle("https://console.example.test/overview", "https://console.example.test/login")
    expect(result).toEqual({ url: "https://accounts.google.test/authorize", error: null })
    expect(requested).toEqual({
      path: "/api/auth/sign-in/social",
      options: {
        method: "POST",
        json: {
          provider: "google",
          callbackURL: "https://console.example.test/overview",
          errorCallbackURL: "https://console.example.test/login",
          disableRedirect: true,
        },
      },
    })
  })

  it("preserves provider configuration and invitation error codes", async () => {
    const transport: MocTransport = {
      async request<T>(): Promise<T> { throw Object.assign(new Error("Invitation required"), { code: "INVITATION_REQUIRED" }) },
      async call<T>() { return null as T },
      url(path) { return path },
    }
    const result = await createAuthClient(transport).signInWithGoogle("https://console.example.test/overview", "https://console.example.test/login")
    expect(result.url).toBeNull()
    expect(result.error?.code).toBe("INVITATION_REQUIRED")
  })

  it("keeps existing session restoration and sign-out endpoints", async () => {
    const calls: string[] = []
    const transport: MocTransport = {
      async request<T>(path): Promise<T> {
        calls.push(path)
        if (path === "/api/auth/get-session") return { session: { id: "s1", userId: "u1", expiresAt: "2027-01-01" }, user: { id: "u1", email: "person@example.test" } } as T
        return null as T
      },
      async call<T>() { return null as T },
      url(path) { return path },
    }
    const auth = createAuthClient(transport)
    const session = await auth.getSession()
    await auth.signOut()
    expect(session?.user).toMatchObject({ id: "u1", email: "person@example.test", name: "", surname: "", emailVerified: false, image: null })
    expect(calls).toEqual(["/api/auth/get-session", "/api/auth/sign-out"])
  })
})
