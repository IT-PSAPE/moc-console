import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { evaluatePasswordStrength, MIN_PASSWORD_LENGTH } from "./password-strength-meter"

const REDIRECT_COUNTDOWN_SECONDS = 4

function getLinkErrorFromUrl(): string | null {
  if (typeof window === "undefined") return null
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const searchParams = new URLSearchParams(window.location.search)
  return hashParams.get("error_description")
    ?? searchParams.get("error_description")
    ?? hashParams.get("error_code")
    ?? searchParams.get("error_code")
    ?? hashParams.get("error")
    ?? searchParams.get("error")
}

export function usePasswordRecovery() {
  const { loading: authLoading, isPasswordRecovery, session, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(REDIRECT_COUNTDOWN_SECONDS)
  const linkError = useMemo(() => authLoading || success ? null : getLinkErrorFromUrl(), [authLoading, success])
  const strength = useMemo(() => evaluatePasswordStrength(password), [password])
  const passwordMeetsMinimum = password.length >= MIN_PASSWORD_LENGTH
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === password
  const showConfirmMismatch = confirmTouched && confirmPassword.length > 0 && confirmPassword !== password
  const canSubmit = passwordMeetsMinimum && confirmMatches
  const destination = session ? `/${routes.dashboard}` : `/${routes.login}`

  useEffect(() => {
    if (!success) return
    if (countdown <= 0) {
      navigate(destination, { replace: true })
      return
    }
    const timeout = window.setTimeout(() => setCountdown((current) => current - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [countdown, destination, navigate, success])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) {
      setConfirmTouched(true)
      return
    }
    setSubmitError("")
    setIsSubmitting(true)
    const result = await updatePassword(password)
    if (result.error) setSubmitError(result.error.message)
    else setSuccess(true)
    setIsSubmitting(false)
  }

  function togglePassword() {
    setShowPassword((visible) => !visible)
  }

  function toggleConfirm() {
    setShowConfirm((visible) => !visible)
  }

  function touchConfirm() {
    setConfirmTouched(true)
  }

  function navigateToDestination() {
    navigate(destination, { replace: true })
  }

  return {
    state: { password, confirmPassword, showPassword, showConfirm, submitError, success, isSubmitting, countdown },
    actions: { setPassword, setConfirmPassword, togglePassword, toggleConfirm, touchConfirm, submit, navigateToDestination },
    meta: {
      authLoading,
      isPasswordRecovery,
      hasSession: Boolean(session),
      linkError,
      strength,
      passwordMeetsMinimum,
      showConfirmMismatch,
      canSubmit,
    },
  }
}
