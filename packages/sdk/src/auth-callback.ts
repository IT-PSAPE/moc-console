export type AuthCallbackOutcome = "verified" | "password-recovery" | null

export function authCallbackOutcome(url: URL): AuthCallbackOutcome {
  if (url.searchParams.get("auth") === "verified") return "verified"
  if (url.searchParams.get("auth") === "password-recovery" || url.searchParams.has("token")) return "password-recovery"
  return null
}

export function authCallbackError(url: URL): string | null {
  const search = url.searchParams
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
  const description = search.get("error_description") ?? hash.get("error_description")
  if (description) return description
  const error = search.get("error") ?? hash.get("error")
  return error ? error.replaceAll("_", " ") : null
}
