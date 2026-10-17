import { Link } from "react-router-dom"
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
import { AuthLayout } from "./auth-layout"
import { MIN_PASSWORD_LENGTH, PasswordStrengthMeter } from "./password-strength-meter"
import { PasswordField } from "./password-field"
import { usePasswordRecovery } from "./use-password-recovery"

export function PasswordRecoveryScreen() {
  const { state, actions, meta } = usePasswordRecovery()

  if (meta.authLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-10"><Spinner size="lg" /></div>
      </AuthLayout>
    )
  }

  if (state.success) {
    return (
      <AuthLayout step={3} totalSteps={3}>
        <div className="flex flex-col gap-5">
          <div className="flex justify-center pt-1">
            <CheckCircle2 className="size-10 text-brand" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <Label.md>You're all set</Label.md>
            <Paragraph.sm className="text-tertiary">Your password was updated. Redirecting in <span className="text-primary tabular-nums">{state.countdown}s</span>.</Paragraph.sm>
          </div>
          <Button className="w-full" onClick={actions.navigateToDestination} icon={<ArrowRight />} iconPosition="trailing">
            {meta.hasSession ? "Continue" : "Back to sign in"}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (!meta.isPasswordRecovery) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-5 text-center">
          <div className="flex justify-center pt-1">
            <AlertCircle className="size-10 text-error" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label.md>{meta.linkError ? "This recovery link won't work" : "Recovery link required"}</Label.md>
            <Paragraph.sm className="text-tertiary">{meta.linkError ?? "Open the latest password recovery link from your inbox."}</Paragraph.sm>
          </div>
          <div className="flex flex-col gap-2">
            <Button.Link render={<Link to={`/${routes.resetPassword}`} />} className="w-full">Request a new link</Button.Link>
            <Button.Link render={<Link to={`/${routes.login}`} />} variant="ghost" className="w-full">Back to sign in</Button.Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout step={3} totalSteps={3}>
      <form onSubmit={actions.submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label.md>Set a new password</Label.md>
          <Paragraph.sm className="text-tertiary">Use at least {MIN_PASSWORD_LENGTH} characters.</Paragraph.sm>
        </div>

        {state.submitError && <Alert variant="error" title={state.submitError} />}

        <FormField label="New password" htmlFor="recovery-new-password" required>
          <PasswordField
            id="recovery-new-password"
            name="new-password"
            value={state.password}
            onChange={actions.setPassword}
            visible={state.showPassword}
            onToggleVisible={actions.togglePassword}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
          />
          {state.password.length > 0 && <PasswordStrengthMeter strength={meta.strength} tooShort={!meta.passwordMeetsMinimum} />}
        </FormField>

        <FormField label="Confirm password" htmlFor="recovery-confirm-password" required>
          <PasswordField
            id="recovery-confirm-password"
            name="confirm-password"
            value={state.confirmPassword}
            onChange={actions.setConfirmPassword}
            visible={state.showConfirm}
            onToggleVisible={actions.toggleConfirm}
            onBlur={actions.touchConfirm}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />
          {meta.showConfirmMismatch && <Paragraph.xs className="text-error">Passwords do not match.</Paragraph.xs>}
        </FormField>

        <Button type="submit" disabled={state.isSubmitting || !meta.canSubmit} className="w-full">
          {state.isSubmitting ? "Saving password…" : "Save password"}
        </Button>
      </form>
    </AuthLayout>
  )
}
