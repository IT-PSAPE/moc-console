import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function ComposerFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={cn('flex items-center justify-between gap-3 px-3 pb-3', className)}>{children}</div>
}
