import { Button } from "@moc/ui/components/controls/button"
import { Notification } from "@moc/ui/components/feedback/notification"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { PublicFlow } from "@/features/components/public-flow"

type TrackingEditorActionsProps = {
  saving: boolean
  error: string | null
  onCancel: () => void
}

export function TrackingEditorActions({ saving, error, onCancel }: TrackingEditorActionsProps) {
  return (
    <>
      {error && <Notification title="Update failed" description={error} variant="error" />}
      <PublicFlow.Actions>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? <Spinner size="sm" /> : "Save changes"}</Button>
      </PublicFlow.Actions>
    </>
  )
}
