import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from '@moc/utils/cn'
import { useCallback, useMemo, useState, type HTMLAttributes, type MouseEventHandler, type ReactElement, type ReactNode } from 'react'
import { Label } from '../display/text'
import { SidebarRailItem } from './sidebar-rail-item'
import { SidebarRailButton } from './sidebar-rail-button'
import { SidebarLayout } from './sidebar-layout'
import { SidebarRail } from './sidebar-rail'
import { SidebarSecondary } from './sidebar-secondary'
import { NavigationList } from './navigation-list'
import { SidebarContext, type SidebarContextValue } from './sidebar-context'
export { useSidebar } from './sidebar-context'

// ─── Context ─────────────────────────────────────────────

const SIDEBAR_WIDTH_KEY = 'moc.sidebar.width'
const SIDEBAR_DEFAULT_WIDTH = 256
const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 400

function clampWidth(width: number): number {
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))
}

function readStoredWidth(): number {
    try {
        const parsed = Number.parseFloat(window.localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? '')
        return Number.isFinite(parsed) ? clampWidth(parsed) : SIDEBAR_DEFAULT_WIDTH
    } catch {
        return SIDEBAR_DEFAULT_WIDTH
    }
}

function writeStoredWidth(width: number): void {
    try { window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width)) } catch { /* storage unavailable */ }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isLandscapeOpen, setIsLandscapeOpen] = useState(false)
    const [isResizing, setResizing] = useState(false)
    const [width, setWidthState] = useState(readStoredWidth)

    const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), [])
    const openLandscape = useCallback(() => setIsLandscapeOpen(true), [])
    const closeLandscape = useCallback(() => setIsLandscapeOpen(false), [])
    const expand = useCallback(() => setIsCollapsed(false), [])
    const setWidth = useCallback((next: number) => {
        const clamped = clampWidth(next)
        setWidthState(clamped)
        writeStoredWidth(clamped)
    }, [])
    const resetWidth = useCallback(() => setWidth(SIDEBAR_DEFAULT_WIDTH), [setWidth])

    const actions = useMemo(() => ({
        toggleCollapsed,
        openLandscape,
        closeLandscape,
        setLandscapeOpen: setIsLandscapeOpen,
        expand,
        setWidth,
        resetWidth,
        setResizing,
    }), [toggleCollapsed, openLandscape, closeLandscape, expand, setWidth, resetWidth])

    const value: SidebarContextValue = useMemo(() => ({
        state: { isCollapsed, isLandscapeOpen, isResizing, width },
        actions,
        meta: { minWidth: SIDEBAR_MIN_WIDTH, maxWidth: SIDEBAR_MAX_WIDTH, defaultWidth: SIDEBAR_DEFAULT_WIDTH },
    }), [isCollapsed, isLandscapeOpen, isResizing, width, actions])

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
        <header className={cn("h-14 px-3 border-b border-secondary inline-flex justify-start items-center overflow-hidden", className)}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {children}
            </div>
        </header>
    )
}

function SidebarContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full py-2 flex flex-col items-start min-h-0 flex-1 overflow-y-auto scrollbar-hidden", className)}>
            {children}
        </div>
    )
}

function SidebarFooter({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("px-3 py-3 border-t border-secondary inline-flex justify-start items-center overflow-hidden", className)}>
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
        <div className={cn("px-3 pt-4 pb-1 inline-flex justify-start items-center gap-2.5", className)}>
            <h3 className="label-xs text-quaternary">{title}</h3>
        </div>
    )
}

function SidebarGroupContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <NavigationList.Root className={cn('px-3', className)}>
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
            onClick={onClick}
            aria-current={render && active ? 'page' : undefined}
            role={render ? 'link' : undefined}
        >
                <div className="flex-1 flex items-center gap-2.5">
                    <div className={cn('size-5 shrink-0 flex items-center justify-center overflow-hidden', active ? 'text-inherit' : 'text-quaternary')}>
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
    RailButton: SidebarRailButton,
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
