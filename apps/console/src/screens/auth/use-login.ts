import { useState } from "react"
import { useAuth } from "@/lib/auth-context"

function readableAuthError(error: Error): string {
  const code = "code" in error && typeof error.code === "string" ? error.code.toLowerCase() : ""
  if (code.includes("invitation") || error.message.toLowerCase().includes("invitation")) {
    return "This Google account does not have a valid invitation to MOC Console. Ask a workspace administrator to invite this email address."
  }
  return error.message || "Google sign-in could not be started. Please try again."
}

export function useLogin() {
  const { signInWithGoogle, callbackError } = useAuth()
  const [error, setError] = useState(callbackError ? readableAuthError(new Error(callbackError)) : "")
  const [loading, setLoading] = useState(false)

  async function signIn(): Promise<void> {
    setError("")
    setLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result.error) setError(readableAuthError(result.error))
    } catch (cause) {
      setError(readableAuthError(cause instanceof Error ? cause : new Error("Google sign-in could not be started")))
    } finally {
      setLoading(false)
    }
  }

  return { state: { error, loading }, actions: { signIn } }
}
