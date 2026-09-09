import type { ChangeEvent } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Mail, MailCheck } from "lucide-react"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { AuthLayout } from "./auth-layout"
import { useResetPassword } from "./use-reset-password"

export function ResetPasswordScreen() {
  const { state, actions, meta } = useResetPassword()

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setEmail(event.target.value)
  }

  if (meta.success) {
    return (
      <AuthLayout step={2} totalSteps={3}>
        <div className="space-y-5">
          <div className="flex justify-center pt-1">
            <MailCheck className="size-10 text-brand_secondary" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5 text-center">
            <h2 className="title-h6">Check your inbox</h2>
            <p className="paragraph-sm text-tertiary">If an account exists for <span className="font-medium text-primary">{state.submittedEmail}</span>, a reset link is on its way.</p>
          </div>
          {state.error && <Alert variant="error" title={state.error} />}
          <div className="space-y-2 pt-1">
            <Button variant="secondary" className="w-full" onClick={actions.resend} disabled={state.isSubmitting}>
              {state.isSubmitting ? "Sending another link…" : "Send again"}
            </Button>
            <Button.Link render={<Link to={`/${routes.login}`} />} variant="ghost" className="w-full" icon={<ArrowLeft />}>Back to sign in</Button.Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout step={1} totalSteps={3}>
      <form onSubmit={actions.submit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="title-h6">Reset your password</h2>
          <p className="paragraph-sm text-tertiary">Enter your account email to receive a reset link.</p>
        </div>
        {state.error && <Alert variant="error" title={state.error} />}

        <div className="space-y-1.5">
          <FormLabel label="Email" required />
          <Input
            aria-label="Email"
            name="email"
            spellCheck={false}
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            value={state.email}
            onChange={handleEmailChange}
            onBlur={actions.touchEmail}
            autoComplete="email"
            required
          />
          {meta.showEmailError && <p className="paragraph-xs text-error">Enter a valid email address.</p>}
        </div>

        <Button type="submit" disabled={state.isSubmitting || !meta.emailIsValid} className="w-full">
          {state.isSubmitting ? "Sending reset link…" : "Send reset link"}
        </Button>
        <p className="paragraph-sm text-center text-tertiary"><Link to={`/${routes.login}`} className="text-brand_secondary hover:underline">Back to sign in</Link></p>
      </form>
    </AuthLayout>
  )
}
