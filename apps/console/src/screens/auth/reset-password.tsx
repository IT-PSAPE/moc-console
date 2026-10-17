import type { ChangeEvent } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Mail, MailCheck } from "lucide-react"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
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
        <div className="flex flex-col gap-5">
          <div className="flex justify-center pt-1">
            <MailCheck className="size-10 text-brand" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <Label.md>Check your inbox</Label.md>
            <Paragraph.sm className="text-tertiary">If an account exists for <span className="font-medium text-primary">{state.submittedEmail}</span>, a reset link is on its way.</Paragraph.sm>
          </div>
          {state.error && <Alert variant="error" title={state.error} />}
          <div className="flex flex-col gap-2">
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
      <form onSubmit={actions.submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label.md>Reset your password</Label.md>
          <Paragraph.sm className="text-tertiary">Enter your account email to receive a reset link.</Paragraph.sm>
        </div>
        {state.error && <Alert variant="error" title={state.error} />}

        <FormField label="Email" htmlFor="reset-email" required>
          <Input
            id="reset-email"
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
          {meta.showEmailError && <Paragraph.xs className="text-error">Enter a valid email address.</Paragraph.xs>}
        </FormField>

        <Button type="submit" disabled={state.isSubmitting || !meta.emailIsValid} className="w-full">
          {state.isSubmitting ? "Sending reset link…" : "Send reset link"}
        </Button>
        <Paragraph.sm className="text-center text-tertiary"><Button.Link render={<Link to={`/${routes.login}`} />} variant="link">Back to sign in</Button.Link></Paragraph.sm>
      </form>
    </AuthLayout>
  )
}
