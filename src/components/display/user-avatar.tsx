import { Avatar } from './avatar'

type AvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type UserAvatarProps = {
    user: { name: string; surname: string; avatarUrl: string | null }
    size?: AvatarSize
    className?: string
}

export function UserAvatar({ user, size, className }: UserAvatarProps) {
    const initials = `${user.name[0] ?? ''}${user.surname[0] ?? ''}`

    if (user.avatarUrl) {
        return <Avatar src={user.avatarUrl} name={initials} size={size} className={className} />
    }

    return <Avatar.initials name={initials} size={size} className={className} />
}
