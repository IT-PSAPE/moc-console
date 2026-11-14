import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import { cn } from "@moc/utils/cn"
import { cv } from "@moc/utils/cv"
import { createContext, useContext, type ComponentProps, type HTMLAttributes } from "react"

type TabsVariant = 'default' | 'pill'

const VariantContext = createContext<TabsVariant>('default')

type Styled<Props> = Omit<Props, 'className'> & { className?: string }

type TabsRootProps = Omit<ComponentProps<typeof BaseTabs.Root>, 'className' | 'defaultValue' | 'value' | 'onValueChange'> & {
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

function TabsRoot({ children, className, defaultTab, value, onValueChange, variant = 'default', ...props }: TabsRootProps) {
    function handleValueChange(next: string | number | null): void {
        if (next !== null) onValueChange?.(String(next))
    }

    return (
        <VariantContext.Provider value={variant}>
            <BaseTabs.Root
                value={value}
                defaultValue={defaultTab}
                onValueChange={handleValueChange}
                className={className}
                {...props}
            >
                {children}
            </BaseTabs.Root>
        </VariantContext.Provider>
    )
}

function TabsList({ children, className, ...props }: Styled<ComponentProps<typeof BaseTabs.List>>) {
    const variant = useContext(VariantContext)
    return (
        <BaseTabs.List className={cn(tabsListVariants({ variant }), className)} {...props}>
            {children}
        </BaseTabs.List>
    )
}

function TabsTab({ children, className, value, ...props }: Styled<Omit<ComponentProps<typeof BaseTabs.Tab>, 'value'>> & { value: string }) {
    const variant = useContext(VariantContext)
    return (
        <BaseTabs.Tab value={value} className={cn(tabsTabVariants({ variant }), className)} {...props}>
            {children}
        </BaseTabs.Tab>
    )
}

// Base UI has no plural "Panels" wrapper — panels live directly under Root — so
// this stays a layout-transparent passthrough for API compatibility.
// Puts the spec's 16px gap between the tab list and whatever the active panel
// renders (docs/design-system.md §2) so consumers don't each add it.
function TabsPanels({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('pt-4', className)} {...props}>{children}</div>
}

function TabsPanel({ children, className, value, ...props }: Styled<Omit<ComponentProps<typeof BaseTabs.Panel>, 'value'>> & { value: string }) {
    return (
        <BaseTabs.Panel value={value} className={cn(className)} {...props}>
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
