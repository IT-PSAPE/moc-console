import type { ChangeEvent } from "react"
import { Link } from "react-router-dom"
import { Lock, Mail } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
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
      <form onSubmit={actions.submit} className="flex flex-col gap-4">
        <Label.md>Sign in</Label.md>
        {state.error && <Alert variant="error" title={state.error} />}
        {state.verificationSent && <Alert variant="success" title="Verification email sent" description="Check your inbox for a new verification link." />}

        <FormField label="Email" htmlFor="login-email" required>
          <Input
            id="login-email"
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
        </FormField>

        <FormField label="Password" htmlFor="login-password" required>
          <Input
            id="login-password"
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
        </FormField>

        <div className="flex justify-end">
          <Button.Link render={<Link to="/reset-password" />} variant="link">Forgot password?</Button.Link>
        </div>
        <Button type="submit" disabled={state.loading} className="w-full">{state.loading ? "Signing in…" : "Sign in"}</Button>
        {state.canResendVerification && <Button type="button" variant="secondary" disabled={state.resendLoading} className="w-full" onClick={actions.resendVerificationEmail}>{state.resendLoading ? "Sending verification email…" : "Resend verification email"}</Button>}
        <Paragraph.sm className="text-center text-tertiary">Don't have an account? <Button.Link render={<Link to="/signup" />} variant="link">Sign up</Button.Link></Paragraph.sm>
      </form>
    </AuthLayout>
  )
}
