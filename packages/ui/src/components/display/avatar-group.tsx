import { cn } from '@moc/utils/cn'
import { Avatar } from './avatar'

type AvatarGroupSize = '2xs' | 'xs' | 'sm'

export type AvatarGroupItem = {
    key: string
    initials: string
    avatarUrl?: string | null
    title?: string
}

type AvatarGroupProps = {
    items: AvatarGroupItem[]
    /** Maximum number of avatars to render; the rest collapse into a +N tail. */
    max?: number
    size?: AvatarGroupSize
    className?: string
}

const overlapClassBySize: Record<AvatarGroupSize, string> = {
    '2xs': '-space-x-1.5',
    'xs': '-space-x-2',
    'sm': '-space-x-2',
}

const overflowClassBySize: Record<AvatarGroupSize, string> = {
    '2xs': 'size-5 text-[9px] leading-none',
    'xs': 'size-6 text-[10px] leading-none',
    'sm': 'size-8 text-xs leading-none',
}

// Match the surface color so the ring around each avatar appears as a clean
// "cutout" against the page background.
const ringClass = 'shadow-[0_0_0_2px_var(--color-background-primary)]'

export function AvatarGroup({ items, max = 3, size = '2xs', className }: AvatarGroupProps) {
    if (items.length === 0) return null

    const visible = items.slice(0, max)
    const overflow = items.length - visible.length

    return (
        <div className={cn('flex items-center', overlapClassBySize[size], className)}>
            {visible.map((item) => (
                <div key={item.key} title={item.title} className="relative">
                    {item.avatarUrl ? (
                        <Avatar src={item.avatarUrl} name={item.initials} size={size} className={ringClass} />
                    ) : (
                        <Avatar.initials size={size} name={item.initials} className={ringClass} />
                    )}
                </div>
            ))}
            {overflow > 0 && (
                <div
                    className={cn(
                        'relative rounded-full bg-secondary text-tertiary font-medium flex items-center justify-center',
                        overflowClassBySize[size],
                        ringClass,
                    )}
                    title={`${overflow} more`}
                >
                    +{overflow}
                </div>
            )}
        </div>
    )
}
