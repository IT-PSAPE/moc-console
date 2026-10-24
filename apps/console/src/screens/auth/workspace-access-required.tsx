import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { AuthLayout } from "./auth-layout"

type WorkspaceAccessRequiredProps = { onSignOut: () => void }

export function WorkspaceAccessRequired({ onSignOut }: WorkspaceAccessRequiredProps) {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-4 text-center">
        <Label.md>No workspace access</Label.md>
        <Paragraph.sm className="text-tertiary">Ask a workspace administrator to invite the Google account you use for MOC Console.</Paragraph.sm>
        <Button className="w-full" onClick={onSignOut}>Sign out</Button>
      </div>
    </AuthLayout>
  )
}
