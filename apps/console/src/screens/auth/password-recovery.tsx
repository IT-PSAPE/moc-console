import { Link } from "react-router-dom"
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { FormLabel } from "@moc/ui/components/form/form-label"
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
        <div className="space-y-5">
          <div className="flex justify-center pt-1">
            <CheckCircle2 className="size-10 text-brand_secondary" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5 text-center">
            <h2 className="title-h6">You're all set</h2>
            <p className="paragraph-sm text-tertiary">Your password was updated. Redirecting in <span className="text-primary tabular-nums">{state.countdown}s</span>.</p>
          </div>
          <Button className="w-full" onClick={actions.navigateToDestination} icon={<ArrowRight />} iconPosition="trailing">
            {meta.hasSession ? "Continue to dashboard" : "Back to sign in"}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (!meta.isPasswordRecovery) {
    return (
      <AuthLayout>
        <div className="space-y-5 text-center">
          <div className="flex justify-center pt-1">
            <AlertCircle className="size-10 text-error" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h2 className="title-h6">{meta.linkError ? "This recovery link won't work" : "Recovery link required"}</h2>
            <p className="paragraph-sm text-tertiary">{meta.linkError ? "The link may have expired or already been used. Request a new one." : "Open the latest password recovery link from your inbox."}</p>
          </div>
          <div className="space-y-2 pt-1">
            <Button.Link render={<Link to={`/${routes.resetPassword}`} />} className="w-full">Request a new link</Button.Link>
            <Button.Link render={<Link to={`/${routes.login}`} />} variant="ghost" className="w-full">Back to sign in</Button.Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout step={3} totalSteps={3}>
      <form onSubmit={actions.submit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="title-h6">Set a new password</h2>
          <p className="paragraph-sm text-tertiary">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>

        {state.submitError && <Alert variant="error" title={state.submitError} />}

        <div className="space-y-1.5">
          <FormLabel label="New password" required />
          <PasswordField
            name="new-password"
            value={state.password}
            onChange={actions.setPassword}
            visible={state.showPassword}
            onToggleVisible={actions.togglePassword}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
          />
          {state.password.length > 0 && <PasswordStrengthMeter strength={meta.strength} tooShort={!meta.passwordMeetsMinimum} />}
        </div>

        <div className="space-y-1.5">
          <FormLabel label="Confirm password" required />
          <PasswordField
            name="confirm-password"
            value={state.confirmPassword}
            onChange={actions.setConfirmPassword}
            visible={state.showConfirm}
            onToggleVisible={actions.toggleConfirm}
            onBlur={actions.touchConfirm}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />
          {meta.showConfirmMismatch && <p className="paragraph-xs text-error">Passwords do not match.</p>}
        </div>

        <Button type="submit" disabled={state.isSubmitting || !meta.canSubmit} className="w-full">
          {state.isSubmitting ? "Saving password…" : "Save password"}
        </Button>
      </form>
    </AuthLayout>
  )
}
