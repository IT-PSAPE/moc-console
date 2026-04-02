import { useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { Mail } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { AuthLayout } from "./auth-layout"

export function ResetPasswordScreen() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const { error } = await resetPassword(email)
        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <AuthLayout>
                <div className="space-y-4 text-center">
                    <h2 className="title-h6">Check your email</h2>
                    <p className="paragraph-sm text-tertiary">
                        If an account exists for <span className="text-primary font-medium">{email}</span>,
                        you'll receive a password reset link shortly.
                    </p>
                    <Link to="/login">
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
                        Enter your email and we'll send you a link to reset your password.
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
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending link..." : "Send reset link"}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Remember your password?{" "}
                    <Link to="/login" className="text-brand_secondary hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
