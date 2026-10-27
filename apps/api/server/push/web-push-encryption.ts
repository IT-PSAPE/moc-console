import { createCipheriv, createECDH, createHmac, randomBytes } from "node:crypto"

const RECORD_SIZE = 4096
const MAX_PAYLOAD_BYTES = 3000
const WEBPUSH_INFO = Buffer.from("WebPush: info\0")
const AES_INFO = Buffer.from("Content-Encoding: aes128gcm\0")
const NONCE_INFO = Buffer.from("Content-Encoding: nonce\0")

export interface WebPushServerKeys {
  publicKey: Buffer
  privateKey: Buffer
}

export interface WebPushEncryptionOptions {
  salt?: Buffer
  serverKeys?: WebPushServerKeys
}

export interface EncryptedWebPushPayload {
  body: Buffer
  salt: Buffer
  serverPublicKey: Buffer
}

function decodeBase64Url(value: string, length: number): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid Web Push key")
  const decoded = Buffer.from(value, "base64url")
  if (decoded.length !== length || decoded.toString("base64url") !== value) throw new Error("Invalid Web Push key")
  return decoded
}

function hmac(key: Buffer, input: Buffer): Buffer {
  return createHmac("sha256", key).update(input).digest()
}

function expand(prk: Buffer, info: Buffer, length: number): Buffer {
  return hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, length)
}

function getServerKeys(serverKeys?: WebPushServerKeys): WebPushServerKeys {
  const ecdh = createECDH("prime256v1")
  if (!serverKeys) {
    ecdh.generateKeys()
    return { publicKey: ecdh.getPublicKey(), privateKey: ecdh.getPrivateKey() }
  }
  if (serverKeys.privateKey.length !== 32 || serverKeys.publicKey.length !== 65 || serverKeys.publicKey[0] !== 4) {
    throw new Error("Invalid Web Push server key")
  }
  ecdh.setPrivateKey(serverKeys.privateKey)
  const derivedPublicKey = ecdh.getPublicKey()
  if (!derivedPublicKey.equals(serverKeys.publicKey)) throw new Error("Invalid Web Push server key")
  return serverKeys
}

export function encryptWebPushPayload(payload: string, p256dh: string, auth: string, options: WebPushEncryptionOptions = {}): EncryptedWebPushPayload {
  const plaintext = Buffer.from(payload, "utf8")
  if (plaintext.length > MAX_PAYLOAD_BYTES) throw new Error("Web Push payload exceeds 3000 bytes")
  const userPublicKey = decodeBase64Url(p256dh, 65)
  if (userPublicKey[0] !== 4) throw new Error("Invalid Web Push key")
  const authSecret = decodeBase64Url(auth, 16)
  const salt = options.salt ?? randomBytes(16)
  if (salt.length !== 16) throw new Error("Invalid Web Push salt")

  const serverKeys = getServerKeys(options.serverKeys)
  const ecdh = createECDH("prime256v1")
  ecdh.setPrivateKey(serverKeys.privateKey)
  const sharedSecret = ecdh.computeSecret(userPublicKey)
  const prkKey = hmac(authSecret, sharedSecret)
  const keyInfo = Buffer.concat([WEBPUSH_INFO, userPublicKey, serverKeys.publicKey])
  const ikm = expand(prkKey, keyInfo, 32)
  const prk = hmac(salt, ikm)
  const contentKey = expand(prk, AES_INFO, 16)
  const nonce = expand(prk, NONCE_INFO, 12)

  const cipher = createCipheriv("aes-128-gcm", contentKey, nonce)
  const ciphertext = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()])
  const header = Buffer.alloc(21)
  salt.copy(header, 0)
  header.writeUInt32BE(RECORD_SIZE, 16)
  header[20] = serverKeys.publicKey.length
  return { body: Buffer.concat([header, serverKeys.publicKey, ciphertext]), salt, serverPublicKey: serverKeys.publicKey }
}
