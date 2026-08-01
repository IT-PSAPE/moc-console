import type { HTMLAttributes, ReactNode } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Button } from '../controls/button'
import { Label } from '../display/text'
import { Drawer } from './drawer'
import { cn } from '@moc/utils/cn'
import { Paragraph } from '../display/text'

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
                        <Button.Icon aria-label="Close filters" variant="ghost" icon={<X />} />
                    </Drawer.Close>
                </Drawer.Header>
                <Drawer.Content>{children}</Drawer.Content>
                <Drawer.Footer className="max-md:*:w-full">
                    {hasActiveFilters && onReset && (
                        <Button variant="secondary" icon={<RotateCcw />} className="w-full" onClick={onReset}>
                            Reset
                        </Button>
                    )}
                    <Drawer.Close>
                        <Button className="w-full">Done</Button>
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
        <section className={cn('border-t border-secondary px-3 py-3 first:border-t-0', className)} {...props}>
            <Paragraph.sm className="pb-2 text-quaternary">{label}</Paragraph.sm>
            {children}
        </section>
    )
}

function FilterDrawerOptions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('grid grid-cols-2 gap-2', className)} {...props}>{children}</div>
}

export const FilterDrawer = Object.assign(FilterDrawerRoot, {
    Group: FilterDrawerGroup,
    Options: FilterDrawerOptions,
})
