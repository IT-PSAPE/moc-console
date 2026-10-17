import { cn } from '@moc/utils/cn'
import type { ComponentProps, HTMLAttributes } from 'react'
import { Button } from '../controls/button'
import { SegmentedControl } from '../controls/segmented-control'
import { Page } from './page'

function CollectionToolbarRoot({ children, className, ...props }: ComponentProps<typeof Page.Toolbar>) {
    return (
        <Page.Toolbar className={cn('@container/collection-toolbar', className)} {...props}>
            {children}
        </Page.Toolbar>
    )
}

function CollectionToolbarViews({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('w-auto landscape:w-full', className)} {...props}>
            {children}
        </div>
    )
}

function CollectionToolbarViewItem({ children, className, ...props }: ComponentProps<typeof SegmentedControl.Item>) {
    return (
        <SegmentedControl.Item className={className} {...props}>
            <span className="whitespace-nowrap @max-[36rem]/collection-toolbar:sr-only landscape:not-sr-only landscape:whitespace-nowrap">{children}</span>
        </SegmentedControl.Item>
    )
}

type CollectionToolbarActionButtonProps = ComponentProps<typeof Button> & {
    'aria-label': string
}

function CollectionToolbarActionButton({ children, className, ...props }: CollectionToolbarActionButtonProps) {
    return (
        <Button
            className={cn(
                'landscape:size-control-lg landscape:gap-0 landscape:px-0 landscape:[&>span:last-child]:sr-only',
                '@max-[36rem]/collection-toolbar:size-control @max-[36rem]/collection-toolbar:gap-0 @max-[36rem]/collection-toolbar:px-0 @max-[36rem]/collection-toolbar:[&>span:last-child]:sr-only',
                className,
            )}
            {...props}
        >
            {children}
        </Button>
    )
}

export const CollectionToolbar = Object.assign(CollectionToolbarRoot, {
    ActionButton: CollectionToolbarActionButton,
    ViewItem: CollectionToolbarViewItem,
    Views: CollectionToolbarViews,
})
