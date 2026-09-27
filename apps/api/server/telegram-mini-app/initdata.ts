// Verifies a Telegram Mini App `initData` string per Telegram's documented
// algorithm (core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
// secret = HMAC_SHA256(key="WebAppData", msg=bot_token); data_check_string is
// every field except `hash`, sorted by key, "key=value" joined by "\n"; the
// hex HMAC_SHA256(key=secret, msg=data_check_string) must equal `hash`.
//
// Pure and fully unit-tested — no Supabase, no network.

import { createHmac, timingSafeEqual } from "node:crypto"

const WEBAPP_DATA_KEY = "WebAppData"
const MAX_INIT_DATA_LENGTH = 4_096
const MAX_AUTH_DATE_AGE_SECONDS = 24 * 60 * 60
const MAX_FUTURE_SKEW_SECONDS = 5 * 60
const HASH_PATTERN = /^[a-f0-9]{64}$/i

export type InitDataVerifyResult =
  | { ok: true; telegramUserId: string }
  | { ok: false; reason: "invalid" | "expired" | "missing_token" }

function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = []
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue
    pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  return pairs.join("\n")
}

function computeHash(dataCheckString: string, botToken: string): string {
  const secretKey = createHmac("sha256", WEBAPP_DATA_KEY).update(botToken).digest()
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex")
}

function hashesMatch(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex")
  const actual = Buffer.from(actualHex, "hex")
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function extractTelegramUserId(params: URLSearchParams): string | null {
  const userRaw = params.get("user")
  if (!userRaw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(userRaw)
  } catch {
    return null
  }
  const id = (parsed as { id?: unknown } | null)?.id
  if (typeof id === "number" && Number.isFinite(id)) return String(id)
  if (typeof id === "string" && id.length > 0) return id
  return null
}

export function verifyInitData(
  initData: string,
  botToken: string | undefined,
  now: Date = new Date(),
): InitDataVerifyResult {
  if (!botToken) return { ok: false, reason: "missing_token" }
  if (!initData || initData.length > MAX_INIT_DATA_LENGTH) return { ok: false, reason: "invalid" }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return { ok: false, reason: "invalid" }
  }

  const hash = params.get("hash")
  if (!hash || !HASH_PATTERN.test(hash)) return { ok: false, reason: "invalid" }

  const dataCheckString = buildDataCheckString(params)
  const computedHash = computeHash(dataCheckString, botToken)
  if (!hashesMatch(computedHash, hash)) return { ok: false, reason: "invalid" }

  const authDateRaw = params.get("auth_date")
  const authDateSeconds = authDateRaw ? Number(authDateRaw) : NaN
  if (!Number.isFinite(authDateSeconds)) return { ok: false, reason: "invalid" }

  const nowSeconds = now.getTime() / 1_000
  if (nowSeconds - authDateSeconds > MAX_AUTH_DATE_AGE_SECONDS) return { ok: false, reason: "expired" }
  if (authDateSeconds - nowSeconds > MAX_FUTURE_SKEW_SECONDS) return { ok: false, reason: "expired" }

  const telegramUserId = extractTelegramUserId(params)
  if (!telegramUserId) return { ok: false, reason: "invalid" }

  return { ok: true, telegramUserId }
}
