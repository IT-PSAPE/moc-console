import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

type ModalHeaderProps = HTMLAttributes<HTMLDivElement>

export function ModalHeader({ children, className, ...props }: ModalHeaderProps) {
    return (
        <div className={cn('flex items-center gap-2 border-b border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}
