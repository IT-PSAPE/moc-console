import { cn } from '@moc/utils/cn'
import type { HTMLAttributes } from 'react'

type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
    'aria-label'?: string
}

export function ButtonGroup({ children, className, ...props }: ButtonGroupProps) {
    return (
        <div
            role="group"
            className={cn(
                'inline-flex overflow-hidden rounded-md border border-secondary bg-primary',
                '[&>*]:!rounded-none [&>*]:!border-y-0 [&>*]:!border-l-0 [&>*]:!border-r [&>*]:!border-secondary [&>*:last-child]:!border-r-0',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}
