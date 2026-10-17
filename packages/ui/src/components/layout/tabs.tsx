import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import { cn } from "@moc/utils/cn"
import { cv } from "@moc/utils/cv"
import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react"

type TabsVariant = 'default' | 'pill'

const VariantContext = createContext<TabsVariant>('default')

type TabsRootProps = {
    children: ReactNode
    className?: string
    defaultTab?: string
    value?: string
    onValueChange?: (value: string) => void
    variant?: TabsVariant
}

const tabsListVariants = cv({
    base: ['flex'],
    variants: {
        variant: {
            default: ['gap-4 px-0 border-b border-secondary'],
            pill: ['gap-1 items-center'],
        },
    },
    defaultVariants: { variant: 'default' },
})

// Active styling keys off Base UI's `data-active` attribute rather than the
// previous computed `${variant}-${active|inactive}` state string.
const tabsTabVariants = cv({
    base: ['flex h-control landscape:h-control-lg cursor-pointer items-center justify-center label-sm text-tertiary transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand motion-reduce:transition-none'],
    variants: {
        variant: {
            default: ['px-1 -mb-px border-b-2 border-transparent hover:text-primary data-[active]:border-brand data-[active]:text-primary'],
            pill: [
                'px-3 rounded-lg',
                'hover:bg-secondary',
                'data-[active]:bg-secondary data-[active]:text-primary',
            ],
        },
    },
    defaultVariants: { variant: 'default' },
})

function TabsRoot({ children, className, defaultTab, value, onValueChange, variant = 'default' }: TabsRootProps) {
    function handleValueChange(next: string | number) {
        onValueChange?.(String(next))
    }

    return (
        <VariantContext.Provider value={variant}>
            <BaseTabs.Root
                value={value}
                defaultValue={defaultTab}
                onValueChange={handleValueChange}
                className={className}
            >
                {children}
            </BaseTabs.Root>
        </VariantContext.Provider>
    )
}

function TabsList({ children, className }: HTMLAttributes<HTMLDivElement>) {
    const variant = useContext(VariantContext)
    return (
        <BaseTabs.List className={cn(tabsListVariants({ variant }), className)}>
            {children}
        </BaseTabs.List>
    )
}

function TabsTab({ children, className, value }: HTMLAttributes<HTMLDivElement> & { value: string }) {
    const variant = useContext(VariantContext)
    return (
        <BaseTabs.Tab value={value} className={cn(tabsTabVariants({ variant }), className)}>
            {children}
        </BaseTabs.Tab>
    )
}

// Base UI has no plural "Panels" wrapper — panels live directly under Root — so
// this stays a layout-transparent passthrough for API compatibility.
// Puts the spec's 16px gap between the tab list and whatever the active panel
// renders (docs/design-system.md §2) so consumers don't each add it.
function TabsPanels({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('pt-4', className)}>{children}</div>
}

function TabsPanel({ children, className, value }: HTMLAttributes<HTMLDivElement> & { value: string }) {
    return (
        <BaseTabs.Panel value={value} className={cn(className)}>
            {children}
        </BaseTabs.Panel>
    )
}

export const Tabs = Object.assign(TabsRoot, {
    List: TabsList,
    Tab: TabsTab,
    Panels: TabsPanels,
    Panel: TabsPanel,
})
