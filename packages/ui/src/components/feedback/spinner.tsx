import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import type { HTMLAttributes } from 'react'
import { Refresh } from 'iconoir-react'

const spinnerVariants = cv({
    base: ['inline-flex shrink-0 animate-spin text-quaternary motion-reduce:animate-none [&>svg]:size-full'],
    variants: {
        size: {
            sm: ['size-4'],
            md: ['size-5'],
            lg: ['size-8'],
        },
    },
    defaultVariants: {
        size: 'md',
    },
})

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
    size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size, className, ...props }: SpinnerProps) {
    return (
        <span role="status" aria-label="Loading" className={cn(spinnerVariants({ size }), className)} {...props}>
            <Refresh aria-hidden="true" />
        </span>
    )
}


export function LoadingSpinner({ size, className, ...props }: SpinnerProps) {
    return (
        <div className={cn('flex items-center justify-center', className)} {...props}>
            <Spinner size={size} />
        </div>
    )
}
