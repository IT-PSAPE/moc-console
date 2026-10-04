type PlatformFailure = { status: number; code: string; message: string }

export function platformFailure(error: unknown): PlatformFailure {
  if (!(error instanceof Error)) return { status: 500, code: "unavailable", message: "Operation unavailable" }
  const details = error as Error & { status?: number; code?: string }
  const status = details.status
  if (status && status >= 400 && status < 500) {
    return { status, code: details.code ?? "invalid_input", message: error.message }
  }
  if (error.name === "AuthError") return { status: 401, code: "unauthenticated", message: "Sign in required" }
  if (error.name === "WorkspaceAccessError" || details.code === "42501") {
    return { status: 403, code: "forbidden", message: "Insufficient permission" }
  }
  if (details.code === "23505" || details.code === "23503") {
    return { status: 409, code: "conflict", message: "This change conflicts with an existing record" }
  }
  if (["22P02", "22007", "22008", "22003", "23502", "23514"].includes(details.code ?? "")) {
    return { status: 400, code: "invalid_input", message: "Invalid operation input" }
  }
  if (details.code === "P0001") return { status: 400, code: "invalid_operation", message: error.message }
  if (/not found$/i.test(error.message)) return { status: 404, code: "not_found", message: error.message }
  if (/^(invalid|unexpected|no .*fields|expected|missing)/i.test(error.message)) {
    return { status: 400, code: "invalid_input", message: error.message }
  }
  return { status: 500, code: "unavailable", message: "Operation unavailable" }
}
