import { useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Mail, MailCheck } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { AuthLayout } from "./auth-layout"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ResetPasswordScreen() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState("")
    const [emailTouched, setEmailTouched] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
    const [error, setError] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const trimmedEmail = email.trim()
    const emailIsValid = EMAIL_PATTERN.test(trimmedEmail)
    const showInlineEmailError =
        emailTouched && trimmedEmail.length > 0 && !emailIsValid
    const success = submittedEmail !== null

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (!emailIsValid) {
            setEmailTouched(true)
            return
        }
        setError("")
        setIsSubmitting(true)
        const { error: resetError } = await resetPassword(trimmedEmail)
        if (resetError) {
            setError(resetError.message)
            setIsSubmitting(false)
            return
        }
        setSubmittedEmail(trimmedEmail)
        setIsSubmitting(false)
    }

    async function handleResend() {
        if (!submittedEmail) return
        setError("")
        setIsSubmitting(true)
        const { error: resetError } = await resetPassword(submittedEmail)
        if (resetError) setError(resetError.message)
        setIsSubmitting(false)
    }

    if (success) {
        return (
            <AuthLayout step={2} totalSteps={3}>
                <div className="space-y-5">
                    <div className="flex justify-center pt-1">
                        <MailCheck
                            className="size-10 text-brand_secondary"
                            strokeWidth={1.5}
                            aria-hidden
                        />
                    </div>
                    <div className="space-y-1.5 text-center">
                        <h2 className="title-h6">Check your inbox</h2>
                        <p className="paragraph-sm text-tertiary">
                            If an account exists for{" "}
                            <span className="text-primary font-medium">
                                {submittedEmail}
                            </span>
                            , a single-use reset link is on its way. Open it on
                            the same device — the link expires shortly.
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-error bg-error_subtle p-3">
                            <p className="paragraph-sm text-error">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2 pt-1">
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleResend}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Sending another link…"
                                : "Didn't get it? Send again"}
                        </Button>
                        <Link to={`/${routes.login}`} className="block">
                            <Button
                                variant="ghost"
                                className="w-full"
                                icon={<ArrowLeft />}
                            >
                                Back to sign in
                            </Button>
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout step={1} totalSteps={3}>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-1.5">
                    <h2 className="title-h6">Forgot your password?</h2>
                    <p className="paragraph-sm text-tertiary">
                        Drop the email tied to your account and we'll send a
                        single-use link to set a new one.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <FormLabel label="Email" required />
                    <Input
                        type="email"
                        placeholder="you@yourchurch.org"
                        icon={<Mail />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        autoComplete="email"
                        autoFocus
                        required
                    />
                    {showInlineEmailError && (
                        <p className="paragraph-xs text-error">
                            That doesn't look like a valid email — check for
                            typos.
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting || !emailIsValid}
                    className="w-full"
                >
                    {isSubmitting ? "Sending your link…" : "Send reset link"}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Suddenly remembered it?{" "}
                    <Link
                        to={`/${routes.login}`}
                        className="text-brand_secondary hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
