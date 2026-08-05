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
        <div className={cn('w-full md:w-auto', className)} {...props}>
            {children}
        </div>
    )
}

function CollectionToolbarViewItem({ children, className, ...props }: ComponentProps<typeof SegmentedControl.Item>) {
    return (
        <SegmentedControl.Item className={cn('md:@max-[36rem]/collection-toolbar:px-2', className)} {...props}>
            <span className="md:@max-[36rem]/collection-toolbar:sr-only">{children}</span>
        </SegmentedControl.Item>
    )
}

function CollectionToolbarActions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex flex-1 gap-2 md:justify-end', className)} {...props}>
            {children}
        </div>
    )
}

type CollectionToolbarActionButtonProps = ComponentProps<typeof Button> & {
    'aria-label': string
}

function CollectionToolbarActionButton({ children, className, ...props }: CollectionToolbarActionButtonProps) {
    return (
        <Button
            className={cn(
                'max-md:gap-0 max-md:px-2 max-md:[&>span:last-child]:sr-only',
                'md:@max-[36rem]/collection-toolbar:gap-0 md:@max-[36rem]/collection-toolbar:px-2 md:@max-[36rem]/collection-toolbar:[&>span:last-child]:sr-only',
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
    Actions: CollectionToolbarActions,
    ViewItem: CollectionToolbarViewItem,
    Views: CollectionToolbarViews,
})
