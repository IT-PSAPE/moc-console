import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

type ModalFooterProps = HTMLAttributes<HTMLDivElement>

export function ModalFooter({ children, className, ...props }: ModalFooterProps) {
    return (
        <div className={cn('flex items-center gap-2 border-t border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}
