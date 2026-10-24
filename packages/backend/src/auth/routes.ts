const AUTH_PATH = /^\/api\/auth\/(?:sign-in\/social|callback\/google|sign-out|get-session)$/

export function isAuthPath(path: string): boolean {
  return AUTH_PATH.test(path)
}

export function isAuthMethodAllowed(path: string, method: string): boolean {
  return (method === "GET" && (path === "/api/auth/get-session" || path === "/api/auth/callback/google"))
    || (method === "POST" && (path === "/api/auth/sign-in/social" || path === "/api/auth/sign-out"))
}

export function isGoogleSignInBody(body: string): boolean {
  try {
    const input: unknown = JSON.parse(body)
    if (!input || typeof input !== "object" || Array.isArray(input)) return false
    const record = input as Record<string, unknown>
    const keys = new Set(["provider", "callbackURL", "errorCallbackURL", "disableRedirect"])
    return record.provider === "google" && Object.keys(record).every((key) => keys.has(key))
      && typeof record.callbackURL === "string" && typeof record.errorCallbackURL === "string"
      && (record.disableRedirect === undefined || typeof record.disableRedirect === "boolean")
  } catch { return false }
}
