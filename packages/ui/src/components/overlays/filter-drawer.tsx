import type { HTMLAttributes, ReactNode } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Button } from '../controls/button'
import { Label } from '../display/text'
import { Drawer } from './drawer'
import { cn } from '@moc/utils/cn'

type FilterDrawerProps = {
    children: ReactNode
    hasActiveFilters?: boolean
    onReset?: () => void
    title?: string
}

function FilterDrawerRoot({ children, hasActiveFilters = false, onReset, title = 'Filter and sort' }: FilterDrawerProps) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <Drawer.Header>
                    <Label.md className="flex-1">{title}</Label.md>
                    <Drawer.Close>
                        <Button.Icon aria-label="Close filters" variant="ghost" size="sm" icon={<X />} />
                    </Drawer.Close>
                </Drawer.Header>
                <Drawer.Content>{children}</Drawer.Content>
                <Drawer.Footer>
                    {hasActiveFilters && onReset && (
                        <Button variant="secondary" icon={<RotateCcw />} onClick={onReset}>
                            Reset
                        </Button>
                    )}
                    <Drawer.Close>
                        <Button>Done</Button>
                    </Drawer.Close>
                </Drawer.Footer>
            </Drawer.Panel>
        </Drawer.Portal>
    )
}

type FilterDrawerGroupProps = HTMLAttributes<HTMLElement> & {
    label: string
}

function FilterDrawerGroup({ children, className, label, ...props }: FilterDrawerGroupProps) {
    return (
        <section className={cn('not-first:pt-4', className)} {...props}>
            <Label.xs className="block pb-2 text-quaternary">{label}</Label.xs>
            {children}
        </section>
    )
}

function FilterDrawerOptions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('grid grid-cols-2 gap-x-4 gap-y-1', className)} {...props}>{children}</div>
}

export const FilterDrawer = Object.assign(FilterDrawerRoot, {
    Group: FilterDrawerGroup,
    Options: FilterDrawerOptions,
})
