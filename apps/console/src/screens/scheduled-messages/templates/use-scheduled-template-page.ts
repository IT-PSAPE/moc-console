import { useParams } from 'react-router-dom'
import { useWorkspace } from '@/lib/workspace-context'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'

export function useScheduledTemplatePage() {
    const { id } = useParams<{ id: string }>()
    const { currentWorkspaceId } = useWorkspace()
    const { state, actions } = useScheduledMessagesContext()
    return { loading: state.loading, error: state.loadError, reload: actions.reload, key: `${currentWorkspaceId}:${id ?? 'new'}` }
}
