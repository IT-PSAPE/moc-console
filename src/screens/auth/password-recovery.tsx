import { useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Link } from "react-router-dom"
import { Lock } from "lucide-react"
import { Button } from "@/components/controls/button"
import { Spinner } from "@/components/feedback/spinner"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { AuthLayout } from "./auth-layout"

function getLinkErrorFromUrl(): string | null {
    if (typeof window === "undefined") return null
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const searchParams = new URLSearchParams(window.location.search)
    const description = hashParams.get("error_description") ?? searchParams.get("error_description")
    if (description) return description
    const code = hashParams.get("error_code") ?? searchParams.get("error_code")
    if (code) return code
    const error = hashParams.get("error") ?? searchParams.get("error")
    return error
}

export function PasswordRecoveryScreen() {
    const { loading: authLoading, isPasswordRecovery, session, updatePassword } = useAuth()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const linkError = useMemo(() => (authLoading ? null : getLinkErrorFromUrl()), [authLoading])

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.target.value)
    }

    function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setConfirmPassword(event.target.value)
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError("")

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setIsSubmitting(true)
        const { error: updateError } = await updatePassword(password)

        if (updateError) {
            setError(updateError.message)
            setIsSubmitting(false)
            return
        }

        setSuccess(true)
        setIsSubmitting(false)
    }

    if (authLoading) {
        return (
            <AuthLayout>
                <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                </div>
            </AuthLayout>
        )
    }

    if (!isPasswordRecovery) {
        const title = linkError ? "This link is no longer valid" : "Recovery link required"
        const description = linkError
            ? linkError
            : "Open the password recovery link from your email to set a new password."

        return (
            <AuthLayout>
                <div className="space-y-4 text-center">
                    <h2 className="title-h6">{title}</h2>
                    <p className="paragraph-sm text-tertiary">{description}</p>
                    <Link to={`/${routes.resetPassword}`}>
                        <Button variant="secondary" className="w-full mt-2">Request a new link</Button>
                    </Link>
                </div>
            </AuthLayout>
        )
    }

    if (success) {
        return (
            <AuthLayout>
                <div className="space-y-4 text-center">
                    <h2 className="title-h6">Password updated</h2>
                    <p className="paragraph-sm text-tertiary">
                        Your password has been reset successfully.
                    </p>
                    <Link to={session ? `/${routes.dashboard}` : `/${routes.login}`}>
                        <Button className="w-full mt-2">
                            {session ? "Continue to dashboard" : "Back to sign in"}
                        </Button>
                    </Link>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <h2 className="title-h6">Choose a new password</h2>
                    <p className="paragraph-sm text-tertiary">
                        Enter your new password to complete the recovery flow.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                <div className="space-y-1">
                    <FormLabel label="New password" required />
                    <Input
                        type="password"
                        placeholder="At least 6 characters"
                        icon={<Lock />}
                        value={password}
                        onChange={handlePasswordChange}
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
                        onChange={handleConfirmPasswordChange}
                        required
                    />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Updating password..." : "Update password"}
                </Button>
            </form>
        </AuthLayout>
    )
}
