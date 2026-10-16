import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import type { HTMLAttributes } from 'react'

type IndicatorColor = 'yellow' | 'green' | 'red' | 'blue' | 'gray' | 'purple' | 'brand' | 'orange'

type IndicatorProps = HTMLAttributes<HTMLSpanElement> & {
    color?: IndicatorColor
}

const indicatorVariants = cv({
    base: [
        'size-full rounded-full',
    ],
    variants: {
        color: {
            yellow: ['bg-utility-yellow-700'],
            green: ['bg-text-success'],
            red: ['bg-error_solid'],
            blue: ['bg-utility-blue-700'],
            gray: ['bg-text-quaternary'],
            purple: ['bg-utility-purple-700'],
            brand: ['bg-brand_solid'],
            orange: ['bg-text-warning'],
        },
    },
    defaultVariants: {
        color: 'gray',
    },
})

function IndicatorRoot({ className, color = 'gray', ...props }: IndicatorProps) {
    return (
        <span className={cn('flex items-center justify-center', className)} {...props}>
            <span className="flex size-4 items-center justify-center rounded-full bg-primary p-[3px]">
                <span className={indicatorVariants({ color })} />
            </span>
        </span>
    )
}

function IndicatorDot({ className, ...props }: IndicatorProps) {
    return <IndicatorRoot className={cn('size-1.5 shrink-0 [&>span]:size-full [&>span]:p-0', className)} {...props} />
}

export const Indicator = Object.assign(IndicatorRoot, { Dot: IndicatorDot })
