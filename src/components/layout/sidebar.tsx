import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import { Children, createContext, useCallback, useContext, useMemo, useState, type HTMLAttributes, type MouseEventHandler, type ReactNode } from 'react'

// ─── Context ─────────────────────────────────────────────

type SidebarContextValue = {
    state: {
        isCollapsed: boolean
        isMobileOpen: boolean
    }
    actions: {
        toggleCollapsed: () => void
        openMobile: () => void
        closeMobile: () => void
        setMobileOpen: (open: boolean) => void
    }
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), [])
    const openMobile = useCallback(() => setIsMobileOpen(true), [])
    const closeMobile = useCallback(() => setIsMobileOpen(false), [])

    const actions = useMemo(() => ({
        toggleCollapsed,
        openMobile,
        closeMobile,
        setMobileOpen: setIsMobileOpen,
    }), [toggleCollapsed, openMobile, closeMobile])

    const value: SidebarContextValue = useMemo(() => ({
        state: { isCollapsed, isMobileOpen },
        actions,
    }), [isCollapsed, isMobileOpen, actions])

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    )
}

// ─── Menu Level Context ──────────────────────────────────

type SidebarMenuLevelContextValue = {
    state: {
        isChild: boolean
    }
    actions: Record<string, never>
    meta: Record<string, never>
}

const sidebarMenuLevelContextDefaultValue: SidebarMenuLevelContextValue = {
    state: {
        isChild: false,
    },
    actions: {},
    meta: {},
}

const SidebarMenuLevelContext = createContext<SidebarMenuLevelContextValue>(sidebarMenuLevelContextDefaultValue)

const nestedSidebarMenuLevelContextValue: SidebarMenuLevelContextValue = {
    state: {
        isChild: true,
    },
    actions: {},
    meta: {},
}

const menuItemVarients = cv({
    base: [
        'py-1 rounded-md inline-flex justify-start items-center gap-2 overflow-hidden w-full ',
    ],
    variants: {
        state: {
            active: ['bg-brand_primary text-brand_secondary hover:bg-brand_secondary'],
            inactive: ['bg-transparent text-color-secondary hover:bg-secondary'],
        },
    },
    defaultVariants: {
        state: 'inactive',
    },
})

function useSidebarMenuLevel() {
    return useContext(SidebarMenuLevelContext)
}

// ─── Components ──────────────────────────────────────────

function SidebarPanel({ children, className }: HTMLAttributes<HTMLDivElement>) {
    const { state } = useSidebar()

    return (
        <aside
            className={cn(
                'flex flex-col border-r border-secondary overflow-hidden bg-primary',
                'area-sidebar',
                // Mobile: fixed overlay, slide in/out
                'fixed inset-y-0 left-0 z-50',
                'transition-transform duration-300 ease-in-out',
                state.isMobileOpen ? 'translate-x-0' : '-translate-x-full',
                // Desktop: static in grid, always visible
                'md:static md:z-auto md:translate-x-0',
                // Width from CSS tokens
                state.isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
                className,
            )}
        >
            {children}
        </aside>
    )
}

function SidebarHeader({ children, className }: HTMLAttributes<HTMLDivElement>) {
    const { state } = useSidebar()
    return (
        <header className={cn("h-header px-2 py-2 border-b border-secondary inline-flex justify-start items-center overflow-hidden", className)}>
            <div className={cn("flex-1 flex justify-start items-center gap-2.5", state.isCollapsed && "justify-center")}>
                {children}
            </div>
        </header>
    )
}

function SidebarContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
    const { state } = useSidebar()
    return (
        <div className={cn("w-full py-1.5 inline-flex flex-col justify-start items-start min-h-0 flex-1 overflow-y-auto scrollbar-hidden", state.isCollapsed && "items-center", className)}>
            {children}
        </div>
    )
}

function SidebarFooter({ children, className }: HTMLAttributes<HTMLDivElement>) {
    const { state } = useSidebar()
    return (
        <div className={cn("px-2 py-3 border-t border-secondary inline-flex justify-start items-center overflow-hidden", className)}>
            <div className={cn("flex-1 rounded-lg flex justify-start items-center gap-2", state.isCollapsed && "justify-center")}>
                {children}
            </div>
        </div>
    )
}

function SidebarGroup({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full py-2 inline-flex flex-col justify-start items-start", className)}>
            {children}
        </div>
    )
}

function SidebarGroupTitle({ title, className }: { title: string, className?: string }) {
    const { state } = useSidebar()
    if (state.isCollapsed) return null
    return (
        <div className={cn("px-4 py-1.5 inline-flex justify-start items-center gap-2.5", className)}>
            <h3 className="text-neutral-500 text-xs">{title}</h3>
        </div>
    )
}

function SidebarGroupContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full px-2 flex flex-col justify-start items-start gap-0.5", className)}>
            {children}
        </div>
    )
}

type SidebarMenuItemProps = {
    children?: ReactNode
    icon?: ReactNode
    active?: boolean
    onClick?: MouseEventHandler<HTMLButtonElement>
    title: string
}

function SidebarMenuItem({ title, children, icon, active = false, onClick }: SidebarMenuItemProps) {
    const { state: levelState } = useSidebarMenuLevel()
    const { state: sidebarState } = useSidebar()
    const [isOpen, setIsOpen] = useState(true)
    const menuChildren = Children.toArray(children)
    const hasChildren = menuChildren.length > 0
    const itemState = active ? 'active' : 'inactive'
    const isCollapsed = sidebarState.isCollapsed

    function handleToggle() {
        if (!hasChildren) {
            return
        }

        setIsOpen(!isOpen)
    }

    const handleClick = hasChildren ? handleToggle : onClick
    const cursorClassName = handleClick ? 'cursor-pointer' : 'cursor-default'

    return (
        <div className={isCollapsed ? "w-fit" : "w-full"}>
            <button type="button" className={cn(menuItemVarients({ state: itemState }), cursorClassName)} onClick={handleClick} aria-expanded={hasChildren ? isOpen : undefined} title={isCollapsed ? title : undefined} > 
                <div className={cn("flex-1 px-1 flex justify-start items-center gap-1.5", isCollapsed && "justify-center px-0")}>
                    <div className="size-6 shrink-0 flex items-center justify-center overflow-hidden">
                        {levelState.isChild ? null : icon}
                    </div>
                    {!isCollapsed && (
                        <span className={"flex-1 justify-start text-sm text-left whitespace-nowrap"}>{title}</span>
                    )}
                    {(!isCollapsed && hasChildren) && (
                        <div className="size-6 shrink-0 flex items-center justify-center overflow-hidden">
                            <ChevronRight className={cn('size-4 transition-transform', isOpen ? 'rotate-90' : 'rotate-0')} aria-hidden="true" />
                        </div>
                    )}
                </div>
            </button>
            <SidebarMenuItemChildren expanded={isOpen}>
                {menuChildren}
            </SidebarMenuItemChildren>
        </div>
    )
}

function SidebarMenuItemChildren({ children, expanded }: HTMLAttributes<HTMLDivElement> & { expanded?: boolean }) {
    const { state } = useSidebar()

    const showChildren = (Children.toArray(children).length > 0) && expanded && !state.isCollapsed

    if (!showChildren) return null;

    return (
        <SidebarMenuLevelContext.Provider value={nestedSidebarMenuLevelContextValue}>
            <div className="flex flex-col justify-start items-start gap-0.5 pt-0.5 w-full">
                {children}
            </div>
        </SidebarMenuLevelContext.Provider>
    )
}

export const Sidebar = {
    Panel: SidebarPanel,
    Header: SidebarHeader,
    Content: SidebarContent,
    Footer: SidebarFooter,
    Group: SidebarGroup,
    GroupTitle: SidebarGroupTitle,
    GroupContent: SidebarGroupContent,
    MenuItem: SidebarMenuItem,
}
