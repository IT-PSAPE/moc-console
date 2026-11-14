import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import type { CSSProperties, HTMLAttributes } from 'react'
import './spinner.css'

const spinnerVariants = cv({
    base: ['inline-flex shrink-0 text-quaternary'],
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
    duration?: number
}

type SpinnerStyle = CSSProperties & {
    '--gather-duration': string
}

export function Spinner({ size, duration = 1600, className, style, ...props }: SpinnerProps) {
    const spinnerStyle: SpinnerStyle = { ...style, '--gather-duration': `${duration}ms` }

    return (
        <span role="status" aria-label="Loading" className={cn(spinnerVariants({ size }), 'gather-spinner', className)} style={spinnerStyle} {...props}>
            <span className="gather-spinner__cluster" aria-hidden="true">
                <span className="gather-spinner__block gather-spinner__block--top-left" />
                <span className="gather-spinner__block gather-spinner__block--top-right" />
                <span className="gather-spinner__block gather-spinner__block--bottom-left" />
                <span className="gather-spinner__block gather-spinner__block--bottom-right" />
            </span>
        </span>
    )
}


export function LoadingSpinner({ size, duration, className, ...props }: SpinnerProps) {
    return (
        <div className={cn('flex items-center justify-center text-quaternary', className)} {...props}>
            <Spinner size={size} duration={duration} className="text-inherit" />
        </div>
    )
}
