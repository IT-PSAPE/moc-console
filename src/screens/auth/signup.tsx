import { useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { AuthLayout } from "./auth-layout"

export function SignupScreen() {
    const { signUp } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError("")

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        const { error } = await signUp(email, password)
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
                        We sent a confirmation link to <span className="text-primary font-medium">{email}</span>.
                        Click the link to activate your account.
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
                <h2 className="title-h6">Create an account</h2>

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

                <div className="space-y-1">
                    <FormLabel label="Password" required />
                    <Input
                        type="password"
                        placeholder="At least 6 characters"
                        icon={<Lock />}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <FormLabel label="Confirm password" required />
                    <Input
                        type="password"
                        placeholder="Re-enter your password"
                        icon={<Lock />}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Creating account..." : "Sign up"}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Already have an account?{" "}
                    <Link to="/login" className="text-brand_secondary hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
