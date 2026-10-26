import { Avatar } from '@moc/ui/components/display/avatar'
import type { DiscussionActorView } from './discussion-types'

export function DiscussionActorAvatar({ actor }: { actor: DiscussionActorView }) {
    if (actor.avatarUrl) return <Avatar src={actor.avatarUrl} name={actor.initials} size="sm" className="rounded-full" />
    return <Avatar.initials name={actor.initials} size="sm" className="rounded-full bg-secondary text-tertiary" />
}
