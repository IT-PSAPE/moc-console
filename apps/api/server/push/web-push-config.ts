import { createECDH } from "node:crypto"
import type { VapidConfig } from "./web-push-vapid.js"
import { createVapidAuthorization } from "./web-push-vapid.js"
import { isValidP256PublicKey } from "./p256-keys.js"

const ENV = ["WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT"] as const

export function getWebPushPublicKey(environment: NodeJS.ProcessEnv = process.env): string | null {
  const publicKey = environment.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? ""
  return isValidP256PublicKey(publicKey) ? publicKey : null
}

export function getWebPushVapidConfig(environment: NodeJS.ProcessEnv = process.env): VapidConfig | null {
  const [publicKey, privateKey, subject] = ENV.map((name) => environment[name]?.trim() ?? "")
  if (!publicKey || !privateKey || !subject) return null
  const config = { publicKey, privateKey, subject }
  try {
    // Validate both the raw key encodings and that the private scalar matches
    // the public key before the delivery worker attempts network sends.
    createVapidAuthorization("https://fcm.googleapis.com", config)
    const privateBytes = Buffer.from(privateKey, "base64url")
    const publicBytes = Buffer.from(publicKey, "base64url")
    const ecdh = createECDH("prime256v1")
    ecdh.setPrivateKey(privateBytes)
    if (!ecdh.getPublicKey().equals(publicBytes)) return null
    return config
  } catch {
    return null
  }
}
