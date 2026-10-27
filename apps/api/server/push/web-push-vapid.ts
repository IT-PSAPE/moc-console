import { createECDH, createPrivateKey, sign } from "node:crypto"

const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}

function decodeKey(value: string, length: number): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid VAPID key")
  const decoded = Buffer.from(value, "base64url")
  if (decoded.length !== length || decoded.toString("base64url") !== value) throw new Error("Invalid VAPID key")
  return decoded
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function validateSubject(subject: string): void {
  try {
    const uri = new URL(subject)
    if (uri.protocol === "mailto:" && !/\s/.test(subject)) return
    if (uri.protocol === "https:" && !uri.username && !uri.password) return
  } catch {
    throw new Error("Invalid VAPID subject")
  }
  throw new Error("Invalid VAPID subject")
}

export function createVapidAuthorization(endpoint: string, config: VapidConfig, nowSeconds = Math.floor(Date.now() / 1000)): string {
  let audience: string
  try {
    const url = new URL(endpoint)
    if (url.protocol !== "https:" || url.username || url.password) throw new Error()
    audience = url.origin
  } catch {
    throw new Error("Invalid Web Push endpoint")
  }
  validateSubject(config.subject)
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 0) throw new Error("Invalid VAPID time")

  const publicKey = decodeKey(config.publicKey, 65)
  if (publicKey[0] !== 4) throw new Error("Invalid VAPID key")
  const privateScalar = decodeKey(config.privateKey, 32)
  const ecdh = createECDH("prime256v1")
  ecdh.setPrivateKey(privateScalar)
  const derivedPublicKey = ecdh.getPublicKey()
  if (!derivedPublicKey.equals(publicKey)) throw new Error("VAPID key pair does not match")

  const privateKey = createPrivateKey({
    format: "jwk",
    key: {
      crv: "P-256",
      d: privateScalar.toString("base64url"),
      kty: "EC",
      x: publicKey.subarray(1, 33).toString("base64url"),
      y: publicKey.subarray(33, 65).toString("base64url"),
    },
  })
  const header = encodeJson({ typ: "JWT", alg: "ES256" })
  const claims = encodeJson({ aud: audience, exp: nowSeconds + TOKEN_LIFETIME_SECONDS, sub: config.subject })
  const input = `${header}.${claims}`
  const signature = sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")
  return `vapid t=${input}.${signature}, k=${config.publicKey}`
}
