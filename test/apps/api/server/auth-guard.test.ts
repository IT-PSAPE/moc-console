import { describe, expect, it } from "vitest"
import { AuthError, requireAuthenticatedUser } from "../../../../apps/api/server/auth-guard.js"

describe("cookie session guard", () => {
  it("derives the user from an opaque cookie lookup and ignores forwarded actor headers", async () => {
    let suppliedCookie = ""
    const authenticated = await requireAuthenticatedUser({
      cookie: "moc.session=opaque",
      "x-moc-session": "forged-token",
      "x-moc-user-id": "attacker-id",
    }, async (cookie) => {
      suppliedCookie = cookie
      return { session: { id: "session-id" }, user: { id: "6cb35a3e-d8f8-4ea4-9876-c9e98ac260d6", email: "person@example.test" } }
    })

    expect(suppliedCookie).toBe("moc.session=opaque")
    expect(authenticated).toEqual({ userId: "6cb35a3e-d8f8-4ea4-9876-c9e98ac260d6", email: "person@example.test" })
  })

  it("rejects legacy token headers and invalid session payloads", async () => {
    await expect(requireAuthenticatedUser({ "x-moc-session": "legacy-token" }, async () => null)).rejects.toBeInstanceOf(AuthError)
    await expect(requireAuthenticatedUser({ cookie: "moc.session=opaque" }, async () => ({ user: { id: 10, email: null } }))).rejects.toBeInstanceOf(AuthError)
    await expect(requireAuthenticatedUser({ cookie: "moc.session=opaque" }, async () => ({ user: { id: "not-a-uuid", email: "person@example.test" } }))).rejects.toBeInstanceOf(AuthError)
  })
})
