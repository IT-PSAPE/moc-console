import type { AnchorHTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

type SkipLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    targetId?: string
}

export function SkipLink({ className, targetId = 'main-content', children = 'Skip to main content', ...props }: SkipLinkProps) {
    return (
        <a
            href={`#${targetId}`}
            className={cn('fixed left-3 top-3 z-[100] -translate-y-20 inline-flex h-control items-center rounded-lg bg-primary px-3 label-sm text-primary shadow-lg outline-none transition-transform focus-visible:translate-y-0 motion-reduce:transition-none', className)}
            {...props}
        >
            {children}
        </a>
    )
}
