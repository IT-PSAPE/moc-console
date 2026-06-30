import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import { cn } from "@moc/utils/cn"
import { cv } from "@moc/utils/cv"
import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react"

type TabsVariant = 'default' | 'pill'

const VariantContext = createContext<TabsVariant>('default')

type TabsRootProps = {
    children: ReactNode
    defaultTab?: string
    value?: string
    onValueChange?: (value: string) => void
    variant?: TabsVariant
}

const tabsListVariants = cv({
    base: ['flex'],
    variants: {
        variant: {
            default: ['gap-3 px-3 border-b border-tertiary'],
            pill: ['gap-1 items-center'],
        },
    },
    defaultVariants: { variant: 'default' },
})

// Active styling keys off Base UI's `data-active` attribute rather than the
// previous computed `${variant}-${active|inactive}` state string.
const tabsTabVariants = cv({
    base: ['cursor-pointer transition-colors outline-none'],
    variants: {
        variant: {
            default: ['py-1.5 border-b-2 paragraph-sm border-transparent data-[active]:border-brand'],
            pill: [
                'px-3 py-1.5 rounded-md label-sm border border-transparent',
                'text-tertiary hover:text-primary hover:bg-secondary',
                'data-[active]:bg-primary data-[active]:text-primary data-[active]:border-secondary data-[active]:shadow-xs',
            ],
        },
    },
    defaultVariants: { variant: 'default' },
})

function TabsRoot({ children, defaultTab, value, onValueChange, variant = 'default' }: TabsRootProps) {
    return (
        <VariantContext.Provider value={variant}>
            <BaseTabs.Root
                value={value}
                defaultValue={defaultTab}
                onValueChange={(next) => onValueChange?.(String(next))}
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
function TabsPanels({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn(className)}>{children}</div>
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
