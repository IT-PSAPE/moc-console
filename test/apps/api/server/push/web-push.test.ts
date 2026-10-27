import assert from "node:assert/strict"
import { createECDH, createPublicKey, createDecipheriv, hkdfSync, verify } from "node:crypto"
import { describe, it } from "vitest"

import { encryptWebPushPayload } from "../../../../../apps/api/server/push/web-push-encryption.js"
import { createVapidAuthorization, type VapidConfig } from "../../../../../apps/api/server/push/web-push-vapid.js"
import { isSupportedWebPushEndpoint, sendWebPush, type WebPushSubscription } from "../../../../../apps/api/server/push/web-push.js"

const RFC_UA_PUBLIC = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4"
const RFC_UA_PRIVATE = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94"
const RFC_AUTH = "BTBZMqHH6r4Tts7J_aSIgg"
const RFC_SALT = "DGv6ra1nlYgDCS1FRnbzlw"
const RFC_SERVER_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"
const RFC_SERVER_PUBLIC = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"
const RFC_ENCRYPTED_BODY = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
const RFC_HEADER = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"
const RFC_CIPHERTEXT = "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ"
const AES_INFO = Buffer.from("Content-Encoding: aes128gcm\0")
const NONCE_INFO = Buffer.from("Content-Encoding: nonce\0")

function vapidConfig(): VapidConfig {
  const ecdh = createECDH("prime256v1")
  ecdh.generateKeys()
  return { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: ecdh.getPrivateKey().toString("base64url"), subject: "mailto:push@example.com" }
}

function subscription(endpoint = "https://fcm.googleapis.com/fcm/send/test-token"): WebPushSubscription {
  return { endpoint, keys: { p256dh: RFC_UA_PUBLIC, auth: RFC_AUTH } }
}

async function withFetch<T>(mock: typeof fetch, run: () => Promise<T>): Promise<T> {
  const previous = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await run()
  } finally {
    globalThis.fetch = previous
  }
}

describe("Web Push encryption", () => {
  it("matches the RFC 8291 Appendix A known-answer body", () => {
    const sender = createECDH("prime256v1")
    sender.setPrivateKey(Buffer.from(RFC_SERVER_PRIVATE, "base64url"))
    assert.equal(sender.getPublicKey().toString("base64url"), RFC_SERVER_PUBLIC)

    const encrypted = encryptWebPushPayload("When I grow up, I want to be a watermelon", RFC_UA_PUBLIC, RFC_AUTH, {
      salt: Buffer.from(RFC_SALT, "base64url"),
      serverKeys: { publicKey: sender.getPublicKey(), privateKey: sender.getPrivateKey() },
    })

    assert.equal(encrypted.body.toString("base64url"), RFC_ENCRYPTED_BODY)
    assert.equal(encrypted.body.subarray(0, 86).toString("base64url"), RFC_HEADER)
    assert.equal(encrypted.body.subarray(86).toString("base64url"), RFC_CIPHERTEXT)
  })

  it("can be independently decrypted with the subscriber private key", () => {
    const encrypted = encryptWebPushPayload("{\"message\":\"hello\"}", RFC_UA_PUBLIC, RFC_AUTH)
    const subscriber = createECDH("prime256v1")
    subscriber.setPrivateKey(Buffer.from(RFC_UA_PRIVATE, "base64url"))
    const keyLength = encrypted.body[20] ?? 0
    const keyId = encrypted.body.subarray(21, 21 + keyLength)
    const salt = encrypted.body.subarray(0, 16)
    const recordSize = encrypted.body.readUInt32BE(16)
    const sharedSecret = subscriber.computeSecret(keyId)
    const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), Buffer.from(RFC_UA_PUBLIC, "base64url"), keyId])
    const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, Buffer.from(RFC_AUTH, "base64url"), keyInfo, 32))
    const contentKey = Buffer.from(hkdfSync("sha256", ikm, salt, AES_INFO, 16))
    const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, NONCE_INFO, 12))
    const ciphertext = encrypted.body.subarray(21 + keyLength, -16)
    const tag = encrypted.body.subarray(-16)
    const decipher = createDecipheriv("aes-128-gcm", contentKey, nonce)
    decipher.setAuthTag(tag)
    const cleartext = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    assert.equal(recordSize, 4096)
    assert.equal(cleartext.at(-1), 2)
    assert.equal(cleartext.subarray(0, -1).toString("utf8"), "{\"message\":\"hello\"}")
  })

  it("rejects payloads above the transport limit", () => {
    assert.throws(() => encryptWebPushPayload("x".repeat(3001), RFC_UA_PUBLIC, RFC_AUTH), /3000 bytes/)
  })

  it("rejects malformed subscriber public points and authentication secrets", () => {
    const invalidPoint = Buffer.alloc(65)
    invalidPoint[0] = 4

    assert.throws(() => encryptWebPushPayload("{}", invalidPoint.toString("base64url"), RFC_AUTH), Error)
    assert.throws(() => encryptWebPushPayload("{}", RFC_UA_PUBLIC, Buffer.alloc(15).toString("base64url")), /Invalid Web Push key/)
  })
})

describe("VAPID authorization", () => {
  it("creates an ES256 JWT with origin audience and a verifiable raw signature", () => {
    const config = vapidConfig()
    const authorization = createVapidAuthorization("https://fcm.googleapis.com/fcm/send/id?token=secret", config, 1000)
    const match = /^vapid t=([^,]+), k=(.+)$/.exec(authorization)
    assert.ok(match)
    const jwt = match[1] ?? ""
    const publicKey = match[2] ?? ""
    const [encodedHeader, encodedClaims, encodedSignature] = jwt.split(".")
    assert.ok(encodedHeader && encodedClaims && encodedSignature)
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { typ: string; alg: string }
    const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as { aud: string; exp: number; sub: string }
    const point = Buffer.from(publicKey, "base64url")
    const verificationKey = createPublicKey({
      format: "jwk",
      key: { kty: "EC", crv: "P-256", x: point.subarray(1, 33).toString("base64url"), y: point.subarray(33, 65).toString("base64url") },
    })

    assert.deepEqual(header, { typ: "JWT", alg: "ES256" })
    assert.deepEqual(claims, { aud: "https://fcm.googleapis.com", exp: 1000 + 12 * 60 * 60, sub: config.subject })
    assert.equal(verify("sha256", Buffer.from(`${encodedHeader}.${encodedClaims}`), { key: verificationKey, dsaEncoding: "ieee-p1363" }, Buffer.from(encodedSignature, "base64url")), true)
  })
})

describe("Web Push transport", () => {
  it("posts an encrypted payload with the required headers and timeout controls", async () => {
    const config = vapidConfig()
    const calls: Array<{ url: string; init: RequestInit | undefined }> = []
    const result = await withFetch(async (input, init) => {
      calls.push({ url: String(input), init })
      return new Response(null, { status: 201 })
    }, async () => {
      const explicitTtl = await sendWebPush(subscription(), "{\"message\":\"hello\"}", config, { ttl: 30, timeoutMs: 2500 })
      const defaultTtl = await sendWebPush(subscription(), "{\"message\":\"hello\"}", config)
      assert.equal(explicitTtl.ok, true)
      assert.equal(defaultTtl.ok, true)
      await assert.rejects(sendWebPush(subscription(), "{}", config, { ttl: 86401 }), /Invalid Web Push TTL/)
      return explicitTtl
    })
    const call = calls[0]
    const headers = new Headers(call?.init?.headers)
    const defaultHeaders = new Headers(calls[1]?.init?.headers)

    assert.deepEqual(result, { ok: true, status: 201, retryAfter: null, expired: false, retryable: false })
    assert.equal(call?.url, subscription().endpoint)
    assert.equal(call?.init?.method, "POST")
    assert.equal(call?.init?.redirect, "error")
    assert.equal(call?.init?.signal instanceof AbortSignal, true)
    assert.equal(headers.get("content-encoding"), "aes128gcm")
    assert.equal(headers.get("ttl"), "30")
    assert.equal(headers.get("content-type"), "application/octet-stream")
    assert.match(headers.get("authorization") ?? "", /^vapid t=/)
    assert.equal(call?.init?.body instanceof Uint8Array, true)
    assert.equal(defaultHeaders.get("ttl"), "3600")
    assert.equal(calls.length, 2)
  })

  it("marks gone subscriptions expired and returns retry timing for rate limits", async () => {
    const config = vapidConfig()
    const expired = await withFetch(async () => new Response(null, { status: 410 }), () => sendWebPush(subscription(), "{}", config))
    const throttled = await withFetch(async () => new Response(null, { status: 429, headers: { "retry-after": "17" } }), () => sendWebPush(subscription(), "{}", config))
    const requestTimedOut = await withFetch(async () => new Response(null, { status: 408 }), () => sendWebPush(subscription(), "{}", config))

    assert.deepEqual(expired, { ok: false, status: 410, retryAfter: null, expired: true, retryable: false, error: "http" })
    assert.deepEqual(throttled, { ok: false, status: 429, retryAfter: "17", expired: false, retryable: true, error: "http" })
    assert.deepEqual(requestTimedOut, { ok: false, status: 408, retryAfter: null, expired: false, retryable: true, error: "http" })
  })

  it("classifies request timeouts and network failures without exposing the endpoint", async () => {
    const config = vapidConfig()
    const timedOut = await withFetch(async () => { throw new DOMException("request timed out", "TimeoutError") }, () => sendWebPush(subscription(), "{}", config))
    const networkFailure = await withFetch(async () => { throw new Error("offline") }, () => sendWebPush(subscription(), "{}", config))

    assert.deepEqual(timedOut, { ok: false, status: null, retryAfter: null, expired: false, retryable: true, error: "timeout" })
    assert.deepEqual(networkFailure, { ok: false, status: null, retryAfter: null, expired: false, retryable: true, error: "network" })
    assert.equal(JSON.stringify(networkFailure).includes(subscription().endpoint), false)
  })

  it("only accepts HTTPS endpoints hosted by supported push providers", async () => {
    const allowed = [
      "https://fcm.googleapis.com/fcm/send/token",
      "https://updates.push.services.mozilla.com/wpush/v2/token",
      "https://web.push.apple.com/token",
      "https://api.push.apple.com/token",
      "https://wns2.notify.windows.com/w/?token=opaque",
    ]
    const blocked = ["http://fcm.googleapis.com/send", "https://127.0.0.1/send", "https://localhost/send", "https://fcm.googleapis.com.attacker.test/send", "https://user@fcm.googleapis.com/send", "https://push.attacker.test/send"]
    const config = vapidConfig()
    let fetchCalls = 0
    const result = await withFetch(async () => {
      fetchCalls += 1
      return new Response(null, { status: 201 })
    }, async () => {
      for (const endpoint of allowed) assert.equal(isSupportedWebPushEndpoint(endpoint), true)
      for (const endpoint of blocked) assert.equal(isSupportedWebPushEndpoint(endpoint), false)
      return sendWebPush(subscription("https://127.0.0.1/private"), "{}", config)
    })

    assert.deepEqual(result, { ok: false, status: null, retryAfter: null, expired: false, retryable: false, error: "invalid-endpoint" })
    assert.equal(fetchCalls, 0)
  })
})
