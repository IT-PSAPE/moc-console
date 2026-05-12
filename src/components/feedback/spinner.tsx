import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import type { HTMLAttributes } from 'react'

const spinnerVariants = cv({
    base: ['animate-spin text-quaternary'],
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
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
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