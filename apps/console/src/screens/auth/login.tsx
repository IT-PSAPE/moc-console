import type { ChangeEvent } from "react"
import { Link } from "react-router-dom"
import { Lock, Mail } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { AuthLayout } from "./auth-layout"
import { useLogin } from "./use-login"

export function LoginScreen() {
  const { state, actions } = useLogin()

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setEmail(event.target.value)
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setPassword(event.target.value)
  }

  return (
    <AuthLayout>
      <form onSubmit={actions.submit} className="space-y-4">
        <h2 className="title-h6">Sign in</h2>
        {state.error && <Alert variant="error" title={state.error} />}

        <div className="space-y-1">
          <FormLabel label="Email" required />
          <Input
            aria-label="Email"
            autoComplete="email"
            name="email"
            spellCheck={false}
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            value={state.email}
            onChange={handleEmailChange}
            required
          />
        </div>

        <div className="space-y-1">
          <FormLabel label="Password" required />
          <Input
            aria-label="Password"
            autoComplete="current-password"
            name="password"
            type="password"
            placeholder="Enter your password"
            icon={<Lock />}
            value={state.password}
            onChange={handlePasswordChange}
            required
          />
        </div>

        <div className="flex justify-end">
          <Link to="/reset-password" className="paragraph-xs text-brand_secondary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" disabled={state.loading} className="w-full">{state.loading ? "Signing in…" : "Sign in"}</Button>
        <p className="paragraph-sm text-center text-tertiary">Don't have an account? <Link to="/signup" className="text-brand_secondary hover:underline">Sign up</Link></p>
      </form>
    </AuthLayout>
  )
}
