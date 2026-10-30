import { Button } from "@moc/ui/components/controls/button"
import { Notification } from "@moc/ui/components/feedback/notification"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { GoogleIcon } from "@moc/ui/components/display/google-icon"
import { AuthLayout } from "./auth-layout"
import { useLogin } from "./use-login"

export function LoginScreen() {
  const { state, actions } = useLogin()

  return (
    <AuthLayout>
      <div className="flex flex-col gap-4">
        <Label.md>Sign in</Label.md>
        {state.error && <Notification variant="error" title={state.error} />}
        <Button type="button" variant="secondary" disabled={state.loading} className="w-full" onClick={actions.signIn}>
          <GoogleIcon />
          {state.loading ? "Connecting to Google…" : "Continue with Google"}
        </Button>
        <Paragraph.sm className="text-center text-tertiary">Use the Google account invited to your workspace.</Paragraph.sm>
      </div>
    </AuthLayout>
  )
}
