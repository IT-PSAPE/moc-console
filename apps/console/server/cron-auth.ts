import { timingSafeEqual } from "node:crypto"

// Shared auth for Vercel Cron endpoints. When CRON_SECRET is set, Vercel
// includes `Authorization: Bearer <CRON_SECRET>` on every scheduled
// invocation; we reject anything that doesn't match. Without the env var
// no caller is authorized (fail closed).

export type CronRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  if (!headers) return null
  const raw = headers[name] ?? headers[name.toLowerCase()]
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function isAuthorizedCron(request: CronRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const provided = headerValue(request.headers, "authorization")
  if (!provided) return false
  return safeEqual(provided, `Bearer ${secret}`)
}
