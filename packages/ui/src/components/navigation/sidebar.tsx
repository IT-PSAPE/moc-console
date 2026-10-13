import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from '@moc/utils/cn'
import { useCallback, useMemo, useState, type HTMLAttributes, type MouseEventHandler, type ReactElement, type ReactNode } from 'react'
import { Label } from '../display/text'
import { SidebarRailItem } from './sidebar-rail-item'
import { SidebarLayout } from './sidebar-layout'
import { SidebarRail } from './sidebar-rail'
import { SidebarSecondary } from './sidebar-secondary'
import { NavigationList } from './navigation-list'
import { SidebarContext, type SidebarContextValue } from './sidebar-context'
export { useSidebar } from './sidebar-context'

// ─── Context ─────────────────────────────────────────────

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), [])
    const openMobile = useCallback(() => setIsMobileOpen(true), [])
    const closeMobile = useCallback(() => setIsMobileOpen(false), [])
    const expand = useCallback(() => setIsCollapsed(false), [])

    const actions = useMemo(() => ({
        toggleCollapsed,
        openMobile,
        closeMobile,
        setMobileOpen: setIsMobileOpen,
        expand,
    }), [toggleCollapsed, openMobile, closeMobile, expand])

    const value: SidebarContextValue = useMemo(() => ({
        state: { isCollapsed, isMobileOpen },
        actions,
        meta: {},
    }), [isCollapsed, isMobileOpen, actions])

    return (
        <BaseTooltip.Provider delay={350} closeDelay={100}>
            <SidebarContext.Provider value={value}>
                {children}
            </SidebarContext.Provider>
        </BaseTooltip.Provider>
    )
}

// ─── Components ──────────────────────────────────────────

function SidebarPanel({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <aside
            className={cn(
                'flex h-full min-h-0 shrink-0 overflow-hidden bg-secondary',
                className,
            )}
            {...props}
        >
            {children}
        </aside>
    )
}

function SidebarHeader({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <header className={cn("px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 border-b border-secondary inline-flex justify-start items-center overflow-hidden", className)}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5 h-8">
                {children}
            </div>
        </header>
    )
}

function SidebarContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full py-1.5 flex flex-col items-start min-h-0 flex-1 overflow-y-auto scrollbar-hidden", className)}>
            {children}
        </div>
    )
}

function SidebarFooter({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-secondary inline-flex justify-start items-center overflow-hidden", className)}>
            <div className="flex-1 rounded-lg flex justify-start items-center gap-2">
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
    return (
        <div className={cn("px-4 py-1.5 inline-flex justify-start items-center gap-2.5", className)}>
            <h3 className="text-neutral-500 text-xs">{title}</h3>
        </div>
    )
}

function SidebarGroupContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <NavigationList.Root className={cn('px-2', className)}>
            {children}
        </NavigationList.Root>
    )
}

type SidebarMenuItemProps = {
    icon?: ReactNode
    active?: boolean
    onClick?: MouseEventHandler<HTMLButtonElement>
    render?: ReactElement
    title: string
}

function SidebarMenuItem({ title, icon, active = false, onClick, render }: SidebarMenuItemProps) {
    return (
        <NavigationList.Item
            active={active}
            tone="brand"
            nativeButton={render === undefined}
            render={render}
            type={render ? undefined : 'button'}
            className="px-2 py-1"
            onClick={onClick}
            aria-current={render && active ? 'page' : undefined}
            role={render ? 'link' : undefined}
        >
                <div className="flex-1 flex items-center gap-2">
                    <div className="size-6 shrink-0 flex items-center justify-center overflow-hidden">
                        {icon}
                    </div>
                        <Label.sm className="flex-1 text-left whitespace-nowrap text-inherit">
                            {title}
                        </Label.sm>
                </div>
        </NavigationList.Item>
    )

}

export const Sidebar = {
    Layout: SidebarLayout,
    Rail: SidebarRail,
    RailItem: SidebarRailItem,
    Secondary: SidebarSecondary,
    Panel: SidebarPanel,
    Header: SidebarHeader,
    Content: SidebarContent,
    Footer: SidebarFooter,
    Group: SidebarGroup,
    GroupTitle: SidebarGroupTitle,
    GroupContent: SidebarGroupContent,
    MenuItem: SidebarMenuItem,
}
