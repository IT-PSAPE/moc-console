// Resolves MOC Console's public base URL for building action links in
// notifications ("View request", "View booking", …).
//
// This app is deployed on its own origin, so VERCEL_URL points at the API,
// not the console — it is deliberately NOT a fallback here any more. A link
// built from it would 404. When no console URL is configured we return null
// and callers skip the link-bearing notification rather than emit a bad link.
//
// CONSOLE_BASE_URL is the canonical name. APP_BASE_URL and MOC_CONSOLE_BASE_URL
// are the pre-split names, still accepted so an existing deployment keeps
// working until its env vars are renamed.
export function resolveBaseUrl(): string | null {
  const configured =
    process.env.CONSOLE_BASE_URL ??
    process.env.APP_BASE_URL ??
    process.env.MOC_CONSOLE_BASE_URL

  if (!configured) return null
  return configured.replace(/\/$/, "")
}
