import { useEffect, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Link } from "react-router-dom"
import { Building2, Lock, Mail, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { fetchSignupWorkspaces } from "@/data/fetch-workspaces"
import type { Workspace } from "@moc/types/workspace"
import { AuthLayout } from "./auth-layout"

export function SignupScreen() {
    const { signUp } = useAuth()
    const [name, setName] = useState("")
    const [surname, setSurname] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [workspaceSlug, setWorkspaceSlug] = useState("")
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [workspacesLoading, setWorkspacesLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const list = await fetchSignupWorkspaces()
                if (cancelled) return
                setWorkspaces(list)
                if (list.length > 0) {
                    const defaultPick = list.find((w) => w.slug === "default-workspace") ?? list[0]
                    setWorkspaceSlug(defaultPick.slug)
                }
            } catch {
                /* leave dropdown empty; backend trigger will fall back to default */
            } finally {
                if (!cancelled) setWorkspacesLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [])

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        setName(event.target.value)
    }

    function handleSurnameChange(event: ChangeEvent<HTMLInputElement>) {
        setSurname(event.target.value)
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.target.value)
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.target.value)
    }

    function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setConfirmPassword(event.target.value)
    }

    function handleWorkspaceChange(event: ChangeEvent<HTMLSelectElement>) {
        setWorkspaceSlug(event.target.value)
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError("")

        const trimmedName = name.trim()
        const trimmedSurname = surname.trim()

        if (!trimmedName || !trimmedSurname) {
            setError("Name and surname are required")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        const { error } = await signUp(email, password, trimmedName, trimmedSurname, workspaceSlug || undefined)
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
                    <FormLabel label="Name" required />
                    <Input
                        type="text"
                        placeholder="First name"
                        icon={<User />}
                        value={name}
                        onChange={handleNameChange}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <FormLabel label="Surname" required />
                    <Input
                        type="text"
                        placeholder="Surname"
                        icon={<User />}
                        value={surname}
                        onChange={handleSurnameChange}
                        required
                    />
                </div>

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

                <div className="space-y-1">
                    <FormLabel label="Workspace" required />
                    <div className="flex items-center gap-1.5 py-2 px-3 rounded-lg border border-secondary bg-primary focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/10">
                        <span className="*:size-4 text-tertiary"><Building2 /></span>
                        <select
                            value={workspaceSlug}
                            onChange={handleWorkspaceChange}
                            disabled={workspacesLoading || workspaces.length === 0}
                            required
                            className="w-full bg-transparent !p-0 focus:!outline-none focus-visible:!outline-0 paragraph-sm !leading-none disabled:cursor-not-allowed"
                        >
                            {workspacesLoading && <option value="">Loading workspaces…</option>}
                            {!workspacesLoading && workspaces.length === 0 && <option value="">No workspaces available</option>}
                            {workspaces.map((workspace) => (
                                <option key={workspace.slug} value={workspace.slug}>{workspace.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <FormLabel label="Password" required />
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
