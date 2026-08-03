import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import type { ComponentProps, HTMLAttributes } from 'react'

type NavigationListItemTone = 'brand' | 'neutral'

const navigationListItemVariants = cv({
    base: [
        'inline-flex min-h-11 w-full cursor-pointer items-center justify-start gap-2 overflow-hidden rounded-md px-3 py-2 label-sm',
        'touch-manipulation transition-colors motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-1',
        'disabled:cursor-not-allowed disabled:text-disable md:min-h-9',
    ],
    variants: {
        state: {
            inactive: ['bg-transparent text-secondary hover:bg-secondary active:bg-secondary'],
            'active-brand': ['bg-brand_primary text-brand_secondary hover:bg-brand_primary active:bg-brand_primary'],
            'active-neutral': ['bg-secondary text-primary hover:bg-secondary active:bg-secondary'],
        },
    },
    defaultVariants: {
        state: 'inactive',
    },
})

function NavigationListRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex w-full flex-col gap-1', className)} {...props}>{children}</div>
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
