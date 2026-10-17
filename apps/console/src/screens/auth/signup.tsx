import type { ChangeEvent } from "react"
import { Link } from "react-router-dom"
import { Lock, Mail, User } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Select } from "@moc/ui/components/form/select"
import type { Workspace } from "@moc/types/workspace"
import { AuthLayout } from "./auth-layout"
import { useSignup } from "./use-signup"
import { MIN_PASSWORD_LENGTH } from "./password-strength-meter"

export function SignupScreen() {
  const { state, actions, meta } = useSignup()

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setName(event.target.value)
  }

  function handleSurnameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSurname(event.target.value)
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setEmail(event.target.value)
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setPassword(event.target.value)
  }

  function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setConfirmPassword(event.target.value)
  }

  function renderWorkspace(workspace: Workspace) {
    return <Select.Item key={workspace.slug} value={workspace.slug}>{workspace.name}</Select.Item>
  }

  if (state.success) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <Label.md>Check your email</Label.md>
          <Paragraph.sm className="text-tertiary">We sent a confirmation link to <span className="font-medium text-primary">{state.email}</span>.</Paragraph.sm>
          <Paragraph.sm className="text-tertiary">After confirming your email, your workspace administrator will review your access request.</Paragraph.sm>
          <Button.Link render={<Link to="/login" />} variant="secondary" className="w-full">Back to sign in</Button.Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form onSubmit={actions.submit} className="flex flex-col gap-4">
        <Label.md>Create an account</Label.md>
        {state.error && <Alert variant="error" title={state.error} />}

        <FormField label="Name" htmlFor="signup-name" required>
          <Input
            id="signup-name"
            aria-label="First name"
            autoComplete="given-name"
            name="given-name"
            type="text"
            placeholder="First name"
            icon={<User />}
            value={state.name}
            onChange={handleNameChange}
            required
          />
        </FormField>

        <FormField label="Surname" htmlFor="signup-surname" required>
          <Input
            id="signup-surname"
            aria-label="Surname"
            autoComplete="family-name"
            name="family-name"
            type="text"
            placeholder="Surname"
            icon={<User />}
            value={state.surname}
            onChange={handleSurnameChange}
            required
          />
        </FormField>

        <FormField label="Email" htmlFor="signup-email" required>
          <Input
            id="signup-email"
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

        <FormField label="Workspace" htmlFor="signup-workspace" required>
          {meta.workspacesError && <RetryAlert title="Couldn't load workspaces" description={meta.workspacesError} onRetry={actions.retryWorkspaces} isRetrying={meta.workspacesLoading} />}
          <Select.Root
            name="workspace"
            items={meta.workspaceItems}
            value={state.workspaceSlug}
            onValueChange={actions.selectWorkspace}
            disabled={meta.workspacesLoading || meta.workspaces.length === 0}
            required
          >
            <Select.Trigger id="signup-workspace" aria-label="Workspace" />
            <Select.Content>
              {meta.workspacesLoading && <Select.Item value="" disabled>Loading workspaces…</Select.Item>}
              {!meta.workspacesLoading && meta.workspacesError && <Select.Item value="" disabled>Workspaces unavailable</Select.Item>}
              {!meta.workspacesLoading && !meta.workspacesError && meta.workspaces.length === 0 && <Select.Item value="" disabled>No workspaces available</Select.Item>}
              {meta.workspaces.map(renderWorkspace)}
            </Select.Content>
          </Select.Root>
        </FormField>

        <FormField label="Password" htmlFor="signup-password" required>
          <Input
            id="signup-password"
            aria-label="Password"
            autoComplete="new-password"
            name="password"
            type="password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            minLength={MIN_PASSWORD_LENGTH}
            icon={<Lock />}
            value={state.password}
            onChange={handlePasswordChange}
            required
          />
        </FormField>

        <FormField label="Confirm password" htmlFor="signup-confirm-password" required>
          <Input
            id="signup-confirm-password"
            aria-label="Confirm password"
            autoComplete="new-password"
            name="confirm-password"
            type="password"
            placeholder="Re-enter your password"
            icon={<Lock />}
            value={state.confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
          />
        </FormField>

        <Button type="submit" disabled={state.loading} className="w-full">{state.loading ? "Creating account…" : "Sign up"}</Button>
        <Paragraph.sm className="text-center text-tertiary">Already have an account? <Button.Link render={<Link to="/login" />} variant="link">Sign in</Button.Link></Paragraph.sm>
      </form>
    </AuthLayout>
  )
}
