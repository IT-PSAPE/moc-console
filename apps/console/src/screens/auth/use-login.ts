import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"

export function useLogin() {
  const { signIn, resendVerification, callbackError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(callbackError ?? "")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [canResendVerification, setCanResendVerification] = useState(callbackError?.toLowerCase().includes("verification email") ?? false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setLoading(true)
    const result = await signIn(email, password)
    if (result.error) {
      setError(result.error.message)
      setCanResendVerification("code" in result.error && result.error.code === "EMAIL_NOT_VERIFIED")
      setLoading(false)
      return
    }
    setCanResendVerification(false)
    setVerificationSent(false)
    navigate(`/${routes.requests}`, { replace: true })
  }

  async function resendVerificationEmail() {
    setResendLoading(true)
    setError("")
    const result = await resendVerification(email.trim())
    if (result.error) setError(result.error.message)
    else setVerificationSent(true)
    setResendLoading(false)
  }

  return {
    state: { email, password, error, loading, resendLoading, verificationSent, canResendVerification },
    actions: { setEmail, setPassword, submit, resendVerificationEmail },
  }
}
