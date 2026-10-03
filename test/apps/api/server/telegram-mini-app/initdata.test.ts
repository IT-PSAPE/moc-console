import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { describe, it } from "node:test"

import { verifyInitData } from "../../../../../apps/api/server/telegram-mini-app/initdata.js"

const BOT_TOKEN = "123456:FAKE-TEST-TOKEN"

function signInitData(fields: Record<string, string>, botToken: string = BOT_TOKEN): string {
  const params = new URLSearchParams(fields)
  const pairs = [...params.entries()].map(([key, value]) => `${key}=${value}`).sort()
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest()
  const hash = createHmac("sha256", secretKey).update(pairs.join("\n")).digest("hex")
  params.set("hash", hash)
  return params.toString()
}

function buildFields(overrides: Partial<{ authDate: number; userId: number }> = {}): Record<string, string> {
  const authDate = overrides.authDate ?? Math.floor(Date.now() / 1_000)
  const userId = overrides.userId ?? 987654321
  return {
    query_id: "AAH_query",
    user: JSON.stringify({ id: userId, first_name: "Craig" }),
    auth_date: String(authDate),
  }
}

describe("verifyInitData", () => {
  it("accepts a validly signed, fresh initData string", () => {
    const initData = signInitData(buildFields())
    const result = verifyInitData(initData, BOT_TOKEN)
    assert.deepEqual(result, { ok: true, telegramUserId: "987654321" })
  })

  it("rejects when the bot token is not configured", () => {
    const initData = signInitData(buildFields())
    assert.deepEqual(verifyInitData(initData, undefined), { ok: false, reason: "missing_token" })
  })

  it("rejects an empty or oversized initData string", () => {
    assert.deepEqual(verifyInitData("", BOT_TOKEN), { ok: false, reason: "invalid" })
    assert.deepEqual(verifyInitData("a".repeat(5_000), BOT_TOKEN), { ok: false, reason: "invalid" })
  })

  it("rejects a missing or malformed hash", () => {
    const params = new URLSearchParams(buildFields())
    assert.equal(verifyInitData(params.toString(), BOT_TOKEN).ok, false)
    params.set("hash", "not-hex")
    assert.equal(verifyInitData(params.toString(), BOT_TOKEN).ok, false)
  })

  it("rejects tampering with any signed field", () => {
    const initData = signInitData(buildFields())
    const params = new URLSearchParams(initData)
    params.set("user", JSON.stringify({ id: 111, first_name: "Attacker" }))
    const result = verifyInitData(params.toString(), BOT_TOKEN)
    assert.deepEqual(result, { ok: false, reason: "invalid" })
  })

  it("rejects a hash signed with the wrong bot token", () => {
    const initData = signInitData(buildFields(), "999999:OTHER-TOKEN")
    assert.deepEqual(verifyInitData(initData, BOT_TOKEN), { ok: false, reason: "invalid" })
  })

  it("rejects auth_date older than 24 hours", () => {
    const stale = Math.floor(Date.now() / 1_000) - 25 * 60 * 60
    const initData = signInitData(buildFields({ authDate: stale }))
    assert.deepEqual(verifyInitData(initData, BOT_TOKEN), { ok: false, reason: "expired" })
  })

  it("rejects auth_date too far in the future", () => {
    const future = Math.floor(Date.now() / 1_000) + 20 * 60
    const initData = signInitData(buildFields({ authDate: future }))
    assert.deepEqual(verifyInitData(initData, BOT_TOKEN), { ok: false, reason: "expired" })
  })

  it("accepts auth_date right at the 24h boundary and rejects just past it", () => {
    const now = new Date()
    const nowSeconds = Math.floor(now.getTime() / 1_000)
    const justInside = nowSeconds - 24 * 60 * 60 + 5
    const justOutside = nowSeconds - 24 * 60 * 60 - 5
    assert.equal(verifyInitData(signInitData(buildFields({ authDate: justInside })), BOT_TOKEN, now).ok, true)
    assert.equal(verifyInitData(signInitData(buildFields({ authDate: justOutside })), BOT_TOKEN, now).ok, false)
  })

  it("rejects a missing or unparsable user field", () => {
    const fields = buildFields()
    delete (fields as Record<string, string>).user
    const initData = signInitData(fields)
    assert.deepEqual(verifyInitData(initData, BOT_TOKEN), { ok: false, reason: "invalid" })
  })

  it("extracts the numeric telegram user id as a string", () => {
    const initData = signInitData(buildFields({ userId: 42 }))
    const result = verifyInitData(initData, BOT_TOKEN)
    assert.deepEqual(result, { ok: true, telegramUserId: "42" })
  })
})
