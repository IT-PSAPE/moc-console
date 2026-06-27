// Resolves the console's public base URL for building action links in
// notifications. Prefers an explicit APP_BASE_URL, falls back to the
// Vercel-provided deployment URL, and returns null when neither is set
// (callers skip link-bearing notifications rather than emit a bad link).
export function resolveBaseUrl(): string | null {
  const explicit = process.env.APP_BASE_URL
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return null
}
