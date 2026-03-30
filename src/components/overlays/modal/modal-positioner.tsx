import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

type ModalPositionerProps = HTMLAttributes<HTMLDivElement>

export function ModalPositioner({ children, className, ...props }: ModalPositionerProps) {
    return (
        <div className={cn('pointer-events-none fixed inset-0 flex items-center justify-center p-2', className)} {...props}>
            {children}
        </div>
    )
}
