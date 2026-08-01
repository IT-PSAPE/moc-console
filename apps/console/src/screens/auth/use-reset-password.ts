import { useState, type FormEvent } from "react"
import { useAuth } from "@/lib/auth-context"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useResetPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [emailTouched, setEmailTouched] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedEmail = email.trim()
  const emailIsValid = EMAIL_PATTERN.test(trimmedEmail)
  const showEmailError = emailTouched && trimmedEmail.length > 0 && !emailIsValid

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!emailIsValid) {
      setEmailTouched(true)
      return
    }
    setError("")
    setIsSubmitting(true)
    const result = await resetPassword(trimmedEmail)
    if (result.error) setError(result.error.message)
    else setSubmittedEmail(trimmedEmail)
    setIsSubmitting(false)
  }

  async function resend() {
    if (!submittedEmail) return
    setError("")
    setIsSubmitting(true)
    const result = await resetPassword(submittedEmail)
    if (result.error) setError(result.error.message)
    setIsSubmitting(false)
  }

  function touchEmail() {
    setEmailTouched(true)
  }

  return {
    state: { email, submittedEmail, error, isSubmitting },
    actions: { setEmail, touchEmail, submit, resend },
    meta: { emailIsValid, showEmailError, success: submittedEmail !== null },
  }
}
