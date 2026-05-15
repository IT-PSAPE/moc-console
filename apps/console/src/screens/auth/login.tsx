import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { AuthLayout } from "./auth-layout"

export function LoginScreen() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const { error } = await signIn(email, password)
        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate("/dashboard", { replace: true })
        }
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="title-h6">Sign in</h2>

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
                        placeholder="Enter your password"
                        icon={<Lock />}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="flex justify-end">
                    <Link to="/reset-password" className="paragraph-xs text-brand_secondary hover:underline">
                        Forgot password?
                    </Link>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Signing in..." : "Sign in"}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-brand_secondary hover:underline">
                        Sign up
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
