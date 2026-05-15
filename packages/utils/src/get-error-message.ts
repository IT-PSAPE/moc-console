function normalizeMessage(value: string | null | undefined): string | null {
  const message = value?.trim()
  return message ? message : null
}

function getObjectMessage(error: Record<string, unknown>): string | null {
  const keys = ["message", "error", "details", "hint"] as const

  for (const key of keys) {
    const value = error[key]
    if (typeof value === "string") {
      const message = normalizeMessage(value)
      if (message) {
        return message
      }
    }
  }

  return null
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return normalizeMessage(error.message) ?? fallback
  }

  if (typeof error === "string") {
    return normalizeMessage(error) ?? fallback
  }

  if (error && typeof error === "object") {
    return getObjectMessage(error as Record<string, unknown>) ?? fallback
  }

  return fallback
}
