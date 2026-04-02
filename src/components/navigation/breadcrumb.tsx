import { ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'

// ─── Label overrides context ────────────────────────────

type BreadcrumbOverrides = Record<string, string>

const BreadcrumbOverridesContext = createContext<{
    overrides: BreadcrumbOverrides
    setOverride: (segment: string, label: string) => void
    removeOverride: (segment: string) => void
}>({
    overrides: {},
    setOverride: () => {},
    removeOverride: () => {},
})

export function useBreadcrumbOverride(segment: string, label: string | undefined) {
    const { setOverride, removeOverride } = useContext(BreadcrumbOverridesContext)

    useEffect(() => {
        if (!label) return
        setOverride(segment, label)
        return () => removeOverride(segment)
    }, [segment, label, setOverride, removeOverride])
}

// ─── Provider ───────────────────────────────────────────

import { useCallback, useState } from 'react'

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [overrides, setOverrides] = useState<BreadcrumbOverrides>({})

    const setOverride = useCallback((segment: string, label: string) => {
        setOverrides(prev => {
            if (prev[segment] === label) return prev
            return { ...prev, [segment]: label }
        })
    }, [])

    const removeOverride = useCallback((segment: string) => {
        setOverrides(prev => {
            if (!(segment in prev)) return prev
            const next = { ...prev }
            delete next[segment]
            return next
        })
    }, [])

    const value = useMemo(() => ({ overrides, setOverride, removeOverride }), [overrides, setOverride, removeOverride])

    return (
        <BreadcrumbOverridesContext.Provider value={value}>
            {children}
        </BreadcrumbOverridesContext.Provider>
    )
}

// ─── Helpers ────────────────────────────────────────────

function formatSegment(segment: string): string {
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function deriveBreadcrumbs(pathname: string, overrides: BreadcrumbOverrides): Array<{ label: string; path: string }> {
    const segments = pathname.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [
        { label: 'Home', path: '/dashboard' },
    ]

    let currentPath = ''
    for (const segment of segments) {
        currentPath += `/${segment}`
        if (currentPath === '/dashboard') continue
        const label = overrides[segment] ?? formatSegment(segment)
        crumbs.push({ label, path: currentPath })
    }

    return crumbs
}

// ─── Components ─────────────────────────────────────────

type BreadcrumbItemProps = {
    label: string
    isLast: boolean
    onClick: () => void
    icon?: ReactNode
}

function BreadcrumbItem({ label, isLast, onClick, icon }: BreadcrumbItemProps) {
    if (isLast) {
        return (
            <span className="text-paragraph-sm text-primary font-medium flex items-center gap-1">
                {icon} {label}
            </span>
        )
    }

    return (
        <button type="button" onClick={onClick} className="text-paragraph-sm text-tertiary hover:text-secondary cursor-pointer flex items-center gap-1" >
            {icon} {label}
        </button>
    )
}

function BreadcrumbSeparator() {
    return (
        <ChevronRight className="size-4 text-placeholder" aria-hidden="true" />
    )
}

function BreadcrumbRoot({ className }: { className?: string }) {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { overrides } = useContext(BreadcrumbOverridesContext)
    const crumbs = deriveBreadcrumbs(pathname, overrides)

    return (
        <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
            <ol className="flex items-center gap-1">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1
                    return (
                        <li key={crumb.path} className="flex items-center gap-1">
                            {index > 0 && <BreadcrumbSeparator />}
                            <BreadcrumbItem label={crumb.label} isLast={isLast} onClick={() => navigate(crumb.path)} />
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

export const Breadcrumb = {
    Root: BreadcrumbRoot,
    Item: BreadcrumbItem,
    Separator: BreadcrumbSeparator,
}
