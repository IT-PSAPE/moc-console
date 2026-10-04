import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const SIGNATURE_HEADER = 'x-moc-auth-signature'
const TIMESTAMP_HEADER = 'x-moc-auth-timestamp'
const NONCE_HEADER = 'x-moc-auth-nonce'
const ORIGIN_HEADER = 'x-moc-auth-origin'
const BODY_DIGEST_HEADER = 'x-moc-auth-body-sha256'
const COOKIE_DIGEST_HEADER = 'x-moc-auth-cookie-sha256'

export type InternalAuthRequest = {
  method: string
  path: string
  body: string
  origin: string
  cookie: string
  timestamp: number
  nonce: string
}

export type VerifiedInternalAuthRequest = InternalAuthRequest & { expiresAt: Date }

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function canonicalRequest(request: InternalAuthRequest): string {
  return [request.method.toUpperCase(), request.path, sha256(request.body), request.origin, sha256(request.cookie), String(request.timestamp), request.nonce].join('\n')
}

function signature(secret: string, request: InternalAuthRequest): string {
  return createHmac('sha256', secret).update(canonicalRequest(request)).digest('hex')
}

export function createInternalAuthHeaders(request: InternalAuthRequest, secret: string): Record<string, string> {
  return {
    [SIGNATURE_HEADER]: signature(secret, request),
    [TIMESTAMP_HEADER]: String(request.timestamp),
    [NONCE_HEADER]: request.nonce,
    [ORIGIN_HEADER]: request.origin,
    [BODY_DIGEST_HEADER]: sha256(request.body),
    [COOKIE_DIGEST_HEADER]: sha256(request.cookie),
  }
}

export function createAuthNonce(): string {
  return randomBytes(24).toString('base64url')
}

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8')
  const rightBytes = Buffer.from(right, 'utf8')
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

export function verifyInternalAuthRequest(request: InternalAuthRequest, headers: Headers, secret: string, now = Date.now(), maxAgeMs = 60_000): VerifiedInternalAuthRequest | null {
  const timestampHeader = headers.get(TIMESTAMP_HEADER)
  const nonce = headers.get(NONCE_HEADER)
  const origin = headers.get(ORIGIN_HEADER)
  const bodyDigest = headers.get(BODY_DIGEST_HEADER)
  const cookieDigest = headers.get(COOKIE_DIGEST_HEADER)
  const suppliedSignature = headers.get(SIGNATURE_HEADER)
  if (!timestampHeader || !nonce || !origin || !bodyDigest || !cookieDigest || !suppliedSignature) return null
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(nonce)) return null

  const timestamp = Number(timestampHeader)
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > maxAgeMs) return null
  const signedRequest = { ...request, timestamp, nonce, origin }
  if (!secureEqual(bodyDigest, sha256(request.body)) || !secureEqual(cookieDigest, sha256(request.cookie))) return null
  if (!secureEqual(suppliedSignature, signature(secret, signedRequest))) return null

  return { ...signedRequest, expiresAt: new Date(timestamp + maxAgeMs) }
}
