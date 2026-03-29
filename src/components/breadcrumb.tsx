import { ChevronRight, Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

function formatSegment(segment: string): string {
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function deriveBreadcrumbs(pathname: string): Array<{ label: string; path: string }> {
    const segments = pathname.split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [
        { label: 'Home', path: '/dashboard' },
    ]

    let currentPath = ''
    for (const segment of segments) {
        currentPath += `/${segment}`
        crumbs.push({ label: formatSegment(segment), path: currentPath })
    }

    return crumbs
}

type BreadcrumbItemProps = {
    label: string
    isLast: boolean
    onClick: () => void
    icon?: ReactNode
}

function BreadcrumbItem({ label, isLast, onClick, icon }: BreadcrumbItemProps) {
    if (isLast) {
        return (
            <span className="text-paragraph-sm text-[var(--text-color-primary)] font-medium flex items-center gap-1">
                {icon}
                {label}
            </span>
        )
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="text-paragraph-sm text-[var(--text-color-tertiary)] hover:text-[var(--text-color-secondary)] cursor-pointer flex items-center gap-1"
        >
            {icon}
            {label}
        </button>
    )
}

function BreadcrumbSeparator() {
    return (
        <ChevronRight className="size-3.5 text-[var(--text-color-tertiary)]" aria-hidden="true" />
    )
}

function BreadcrumbRoot({ className }: { className?: string }) {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const crumbs = deriveBreadcrumbs(pathname)

    return (
        <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
            <ol className="flex items-center gap-1">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1
                    return (
                        <li key={crumb.path} className="flex items-center gap-1">
                            {index > 0 && <BreadcrumbSeparator />}
                            <BreadcrumbItem
                                label={crumb.label}
                                isLast={isLast}
                                onClick={() => navigate(crumb.path)}
                                icon={index === 0 ? <Home className="size-4" /> : undefined}
                            />
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
