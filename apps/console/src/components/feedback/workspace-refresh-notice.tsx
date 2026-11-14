import { useWorkspaceRefreshRecovery } from '@/hooks/use-workspace-refresh-recovery'
import { useWorkspace } from '@/lib/workspace-context'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'

export function WorkspaceRefreshNotice() {
  const { currentWorkspaceId } = useWorkspace()
  const { state, actions } = useWorkspaceRefreshRecovery(currentWorkspaceId)

  if (!state.hasRefreshError) return null

  return <RetryNotification key={currentWorkspaceId} title="Some information may be out of date" description="The latest changes couldn't be loaded. Your last loaded information is still available." isRetrying={state.isRetrying} onRetry={actions.retry} />
}
