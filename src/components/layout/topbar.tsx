import type { HTMLAttributes } from 'react'

export function TopBar({ children }: HTMLAttributes<HTMLDivElement>) {
    return (
        <header className="area-topbar h-header border-b border-secondary flex items-center gap-2 px-4">
            {children}
        </header>
    )
}
