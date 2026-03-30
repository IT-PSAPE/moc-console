import { cn } from '@/utils/cn'
import type { HTMLAttributes } from 'react'

type ModalBodyProps = HTMLAttributes<HTMLDivElement>

export function ModalBody({ children, className, ...props }: ModalBodyProps) {
    return (
        <div className={cn('flex-1 flex flex-col overflow-y-auto', className)} {...props}>
            {children}
        </div>
    )
}
