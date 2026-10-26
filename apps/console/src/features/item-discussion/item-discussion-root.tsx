import type { ItemKind } from '@moc/types/discussion'
import { ItemDiscussionContext } from './item-discussion-context'
import { ItemDiscussionTabs } from './item-discussion-tabs'
import { useItemDiscussion } from './use-item-discussion'

export function ItemDiscussionRoot({ kind, itemId, enabled }: { kind: ItemKind; itemId: string; enabled: boolean }) {
    const discussion = useItemDiscussion(kind, itemId, enabled)
    return <ItemDiscussionContext value={discussion}><ItemDiscussionTabs /></ItemDiscussionContext>
}
