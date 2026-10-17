import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import type { ComponentProps, HTMLAttributes } from 'react'

type NavigationListItemTone = 'brand' | 'neutral'

const navigationListItemVariants = cv({
    base: [
        'inline-flex h-control landscape:h-control-lg w-full cursor-pointer items-center justify-start gap-2.5 overflow-hidden rounded-lg px-3 label-sm',
        'touch-manipulation transition-colors motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand',
        'disabled:cursor-not-allowed disabled:text-quaternary',
    ],
    variants: {
        state: {
            inactive: ['bg-transparent text-secondary hover:bg-tertiary active:bg-tertiary'],
            'active-brand': ['bg-brand text-brand hover:bg-brand active:bg-brand'],
            'active-neutral': ['bg-secondary text-primary hover:bg-secondary active:bg-secondary'],
        },
    },
    defaultVariants: {
        state: 'inactive',
    },
})

function NavigationListRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex w-full flex-col gap-0.5', className)} {...props}>{children}</div>
}

type NavigationListItemProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
    active?: boolean
    className?: string
    tone?: NavigationListItemTone
}

function NavigationListItem({ active = false, className, tone = 'neutral', ...props }: NavigationListItemProps) {
    const state = active ? (tone === 'brand' ? 'active-brand' : 'active-neutral') : 'inactive'

    return (
        <BaseButton
            className={cn(navigationListItemVariants({ state }), className)}
            {...props}
        />
    )
}

export const NavigationList = {
    Item: NavigationListItem,
    Root: NavigationListRoot,
}
