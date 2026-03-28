import type { HTMLAttributes } from 'react'

export function TopBar({ children }: HTMLAttributes<HTMLDivElement>) {
    return (
        <header className="shrink-0 border-b border-secondary h-14">
            {children}
        </header>
    )
}
