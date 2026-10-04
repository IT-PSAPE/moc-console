import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "../../../packages/backend/src/auth/password.js"

describe("authentication password hashing", () => {
  it("hashes passwords and verifies only the matching secret", async () => {
    const hash = await hashPassword("correct horse battery staple")

    expect(hash).not.toContain("correct horse battery staple")
    expect(await verifyPassword({ hash, password: "correct horse battery staple" })).toBe(true)
    expect(await verifyPassword({ hash, password: "different password" })).toBe(false)
  })

  it("rejects values that are not bcrypt hashes", async () => {
    expect(await verifyPassword({ hash: "not-a-hash", password: "password" })).toBe(false)
  })
})
