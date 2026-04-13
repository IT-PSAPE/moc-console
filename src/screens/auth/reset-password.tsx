import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Link } from "react-router-dom"
import { Mail } from "lucide-react"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { AuthLayout } from "./auth-layout"

export function ResetPasswordScreen() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.target.value)
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError("")
        setIsSubmitting(true)

        const { error: resetError } = await resetPassword(email)

        if (resetError) {
            setError(resetError.message)
            setIsSubmitting(false)
            return
        }

        setSuccess(true)
        setIsSubmitting(false)
    }

    if (success) {
        return (
            <AuthLayout>
                <div className="space-y-4 text-center">
                    <h2 className="title-h6">Check your email</h2>
                    <p className="paragraph-sm text-tertiary">
                        If an account exists for <span className="text-primary font-medium">{email}</span>,
                        you&apos;ll receive a password reset link shortly.
                    </p>
                    <Link to={`/${routes.login}`}>
                        <Button variant="secondary" className="w-full mt-2">Back to sign in</Button>
                    </Link>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <h2 className="title-h6">Reset password</h2>
                    <p className="paragraph-sm text-tertiary">
                        Enter your email and we&apos;ll send you a link to reset your password.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                <div className="space-y-1">
                    <FormLabel label="Email" required />
                    <Input
                        type="email"
                        placeholder="you@example.com"
                        icon={<Mail />}
                        value={email}
                        onChange={handleEmailChange}
                        required
                    />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Sending link..." : "Send reset link"}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Remember your password?{" "}
                    <Link to={`/${routes.login}`} className="text-brand_secondary hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
