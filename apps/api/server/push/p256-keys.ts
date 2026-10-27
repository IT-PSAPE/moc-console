import { createPublicKey } from "node:crypto"

const BASE64URL = /^[A-Za-z0-9_-]+$/

export function decodeBase64UrlKey(value: string, byteLength: number): Buffer | null {
  if (!BASE64URL.test(value)) return null
  const decoded = Buffer.from(value, "base64url")
  return decoded.length === byteLength && decoded.toString("base64url") === value ? decoded : null
}

export function isValidP256PublicKey(value: string): boolean {
  const key = decodeBase64UrlKey(value, 65)
  if (!key || key[0] !== 4) return false
  try {
    createPublicKey({
      format: "jwk",
      key: {
        crv: "P-256",
        kty: "EC",
        x: key.subarray(1, 33).toString("base64url"),
        y: key.subarray(33, 65).toString("base64url"),
      },
    })
    return true
  } catch {
    return false
  }
}
