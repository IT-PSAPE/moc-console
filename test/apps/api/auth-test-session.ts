const AUTH_ENVIRONMENT = {
  NEON_AUTH_FUNCTION_URL: "https://auth.test",
  MOC_AUTH_SERVICE_SECRET: "local-auth-test-secret-with-sufficient-entropy",
  MOC_AUTH_TRUSTED_ORIGINS: "http://localhost:5173",
  MOC_CONSOLE_ORIGIN: "http://localhost:5173",
}

export const authCookieHeaders = {
  cookie: "better-auth.session_token=opaque-test-session",
  origin: "http://localhost:5173",
}

export function configureAuthSessionTestEnvironment(): () => void {
  const previous = Object.fromEntries(Object.keys(AUTH_ENVIRONMENT).map((key) => [key, process.env[key]]))
  Object.assign(process.env, AUTH_ENVIRONMENT)
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

export function withAuthSessionResponse(fallback: typeof fetch, userId: string, email = "person@example.test"): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input))
    if (url.hostname === "auth.test" && url.pathname === "/api/auth/get-session") {
      return Response.json({ session: { id: "auth-test-session", userId, expiresAt: new Date(Date.now() + 60_000).toISOString() }, user: { id: userId, email } })
    }
    return fallback(input, init)
  }
}
