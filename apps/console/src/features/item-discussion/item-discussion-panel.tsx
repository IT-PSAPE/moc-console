import type { ItemKind } from '@moc/types/discussion'
import { useWorkspace } from '@/lib/workspace-context'
import { ItemDiscussionRoot } from './item-discussion-root'

type ItemDiscussionPanelProps = { kind: ItemKind; itemId: string; enabled?: boolean }

export function ItemDiscussionPanel({ kind, itemId, enabled = true }: ItemDiscussionPanelProps) {
    const { currentWorkspaceId } = useWorkspace()
    return <ItemDiscussionRoot key={`${currentWorkspaceId}:${kind}:${itemId}`} kind={kind} itemId={itemId} enabled={enabled} />
}
