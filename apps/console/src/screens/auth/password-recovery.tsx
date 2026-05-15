import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Lock,
} from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import { cn } from "@moc/utils/cn"
import { AuthLayout } from "./auth-layout"

type Strength = "weak" | "medium" | "strong"

const MIN_PASSWORD_LENGTH = 8
const REDIRECT_COUNTDOWN_SECONDS = 4

function evaluateStrength(password: string): Strength {
    if (password.length < MIN_PASSWORD_LENGTH) return "weak"
    let signals = 0
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) signals++
    if (/\d/.test(password)) signals++
    if (/[^a-zA-Z0-9]/.test(password)) signals++
    if (password.length >= 14) signals++
    if (signals >= 3) return "strong"
    if (signals >= 1) return "medium"
    return "weak"
}

function getLinkErrorFromUrl(): string | null {
    if (typeof window === "undefined") return null
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const searchParams = new URLSearchParams(window.location.search)
    const description =
        hashParams.get("error_description") ??
        searchParams.get("error_description")
    if (description) return description
    const code = hashParams.get("error_code") ?? searchParams.get("error_code")
    if (code) return code
    return hashParams.get("error") ?? searchParams.get("error")
}

export function PasswordRecoveryScreen() {
    const {
        loading: authLoading,
        isPasswordRecovery,
        session,
        updatePassword,
    } = useAuth()
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

    const linkError = useMemo(
        () => (authLoading || success ? null : getLinkErrorFromUrl()),
        [authLoading, success],
    )

    const strength = useMemo(() => evaluateStrength(password), [password])
    const passwordMeetsMinimum = password.length >= MIN_PASSWORD_LENGTH
    const confirmMatches =
        confirmPassword.length > 0 && confirmPassword === password
    const showConfirmMismatch =
        confirmTouched &&
        confirmPassword.length > 0 &&
        confirmPassword !== password
    const canSubmit = passwordMeetsMinimum && confirmMatches

    const destination = session ? `/${routes.dashboard}` : `/${routes.login}`
    const destinationLabel = session ? "dashboard" : "sign-in screen"

    useEffect(() => {
        if (!success) return
        if (countdown <= 0) {
            navigate(destination, { replace: true })
            return
        }
        const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
        return () => window.clearTimeout(id)
    }, [success, countdown, navigate, destination])

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (!canSubmit) {
            setConfirmTouched(true)
            return
        }
        setSubmitError("")
        setIsSubmitting(true)
        const { error: updateError } = await updatePassword(password)
        if (updateError) {
            setSubmitError(updateError.message)
            setIsSubmitting(false)
            return
        }
        setSuccess(true)
        setIsSubmitting(false)
    }

    if (authLoading) {
        return (
            <AuthLayout>
                <div className="flex items-center justify-center py-10">
                    <Spinner size="lg" />
                </div>
            </AuthLayout>
        )
    }

    if (success) {
        return (
            <AuthLayout step={3} totalSteps={3}>
                <div className="space-y-5">
                    <div className="flex justify-center pt-1">
                        <CheckCircle2
                            className="size-10 text-brand_secondary"
                            strokeWidth={1.5}
                            aria-hidden
                        />
                    </div>
                    <div className="space-y-1.5 text-center">
                        <h2 className="title-h6">You're all set</h2>
                        <p className="paragraph-sm text-tertiary">
                            Your password's been updated. Taking you to the{" "}
                            {destinationLabel} in{" "}
                            <span className="text-primary tabular-nums">
                                {countdown}s
                            </span>
                            .
                        </p>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() =>
                            navigate(destination, { replace: true })
                        }
                        icon={<ArrowRight />}
                        iconPosition="trailing"
                    >
                        {session
                            ? "Continue to dashboard"
                            : "Back to sign in"}
                    </Button>
                </div>
            </AuthLayout>
        )
    }

    if (!isPasswordRecovery) {
        return (
            <AuthLayout>
                <div className="space-y-5">
                    <div className="flex justify-center pt-1">
                        <AlertCircle
                            className="size-10 text-error"
                            strokeWidth={1.5}
                            aria-hidden
                        />
                    </div>
                    <div className="space-y-1.5 text-center">
                        <h2 className="title-h6">
                            {linkError
                                ? "This recovery link won't work"
                                : "Recovery link required"}
                        </h2>
                        <p className="paragraph-sm text-tertiary">
                            {linkError
                                ? "Reset links are single-use and short-lived. Common reasons one fails:"
                                : "Open the most recent password recovery link from your inbox to set a new password."}
                        </p>
                    </div>

                    {linkError && (
                        <ul className="space-y-2.5 paragraph-sm text-tertiary">
                            <li className="flex gap-2.5">
                                <span className="text-quaternary mt-[2px]">
                                    ·
                                </span>
                                <span>
                                    Links can only be used once — older ones
                                    stop working as soon as a newer one is sent.
                                </span>
                            </li>
                            <li className="flex gap-2.5">
                                <span className="text-quaternary mt-[2px]">
                                    ·
                                </span>
                                <span>
                                    They expire shortly after sending. If too
                                    much time has passed, request a fresh one.
                                </span>
                            </li>
                            <li className="flex gap-2.5">
                                <span className="text-quaternary mt-[2px]">
                                    ·
                                </span>
                                <span>
                                    Some email scanners open links
                                    automatically. Try again from a different
                                    inbox or device.
                                </span>
                            </li>
                        </ul>
                    )}

                    <div className="space-y-2 pt-1">
                        <Link
                            to={`/${routes.resetPassword}`}
                            className="block"
                        >
                            <Button className="w-full">
                                Request a new link
                            </Button>
                        </Link>
                        <Link to={`/${routes.login}`} className="block">
                            <Button variant="ghost" className="w-full">
                                Back to sign in
                            </Button>
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout step={3} totalSteps={3}>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-1.5">
                    <h2 className="title-h6">Set a new password</h2>
                    <p className="paragraph-sm text-tertiary">
                        Pick something only you would use. We'll sign you in as
                        soon as you save.
                    </p>
                </div>

                {submitError && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{submitError}</p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <FormLabel label="New password" required />
                    <PasswordField
                        value={password}
                        onChange={setPassword}
                        visible={showPassword}
                        onToggleVisible={() =>
                            setShowPassword((v) => !v)
                        }
                        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                        autoFocus
                        autoComplete="new-password"
                    />
                    {password.length > 0 && (
                        <StrengthMeter
                            strength={strength}
                            tooShort={!passwordMeetsMinimum}
                        />
                    )}
                </div>

                <div className="space-y-1.5">
                    <FormLabel label="Confirm password" required />
                    <PasswordField
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        visible={showConfirm}
                        onToggleVisible={() => setShowConfirm((v) => !v)}
                        onBlur={() => setConfirmTouched(true)}
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                    />
                    {showConfirmMismatch && (
                        <p className="paragraph-xs text-error">
                            These passwords don't match yet.
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting || !canSubmit}
                    className="w-full"
                >
                    {isSubmitting ? "Saving your password…" : "Save password"}
                </Button>
            </form>
        </AuthLayout>
    )
}

type PasswordFieldProps = {
    value: string
    onChange: (next: string) => void
    onBlur?: () => void
    visible: boolean
    onToggleVisible: () => void
    placeholder?: string
    autoFocus?: boolean
    autoComplete?: string
}

function PasswordField({
    value,
    onChange,
    onBlur,
    visible,
    onToggleVisible,
    placeholder,
    autoFocus,
    autoComplete,
}: PasswordFieldProps) {
    return (
        <div className="relative">
            <Input
                type={visible ? "text" : "password"}
                icon={<Lock />}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                className="pr-10"
                required
            />
            <button
                type="button"
                onClick={onToggleVisible}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                className="absolute inset-y-0 right-3 flex items-center text-tertiary hover:text-secondary transition-colors"
            >
                {visible ? (
                    <EyeOff className="size-4" />
                ) : (
                    <Eye className="size-4" />
                )}
            </button>
        </div>
    )
}

function StrengthMeter({
    strength,
    tooShort,
}: {
    strength: Strength
    tooShort: boolean
}) {
    const filled =
        strength === "weak" ? 1 : strength === "medium" ? 2 : 3
    const label =
        strength === "weak" ? "Weak" : strength === "medium" ? "OK" : "Strong"
    const hint = tooShort
        ? `Keep going — minimum is ${MIN_PASSWORD_LENGTH} characters.`
        : strength === "medium"
          ? "Looking good. Mix in numbers or symbols to make it stronger."
          : null
    return (
        <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors duration-300",
                                i <= filled
                                    ? "bg-brand_solid"
                                    : "bg-quaternary",
                            )}
                        />
                    ))}
                </div>
                <span className="label-xs text-tertiary whitespace-nowrap">
                    {label}
                </span>
            </div>
            {hint && (
                <p className="paragraph-xs text-tertiary">{hint}</p>
            )}
        </div>
    )
}
