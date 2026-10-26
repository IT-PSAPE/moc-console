import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import type { CommentView } from './discussion-types'
import { DiscussionActorAvatar } from './discussion-actor-avatar'

export function ItemCommentRow({ comment }: { comment: CommentView }) {
    return (
        <ListItemCard.Root className="items-start gap-y-1 px-0 py-0 landscape:px-0" aria-label={`Comment by ${comment.actor.name}`}>
            <ListItemCard.Leading className="bg-transparent">
                <DiscussionActorAvatar actor={comment.actor} />
            </ListItemCard.Leading>
            <ListItemCard.Content className="basis-0 gap-1 pt-0.5">
                <Paragraph.sm className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><Label.sm className="min-w-0 break-words [overflow-wrap:anywhere]">{comment.actor.name}</Label.sm><Label.xs className="text-tertiary">{comment.time.relative}{' · '}{comment.time.exact}</Label.xs></Paragraph.sm>
                {comment.origin && <Paragraph.xs className="text-tertiary">{comment.origin}</Paragraph.xs>}
                <Paragraph.sm className="whitespace-pre-wrap text-secondary [overflow-wrap:anywhere]">{comment.body}</Paragraph.sm>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
