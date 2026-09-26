import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import type { HTMLAttributes } from 'react'

type IndicatorColor = 'yellow' | 'green' | 'red' | 'blue' | 'gray' | 'purple'

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
        },
    },
    defaultVariants: {
        color: 'gray',
    },
})

export function Indicator({ className, color = 'gray', ...props }: IndicatorProps) {
    return (
        <span className={cn('flex items-center justify-center', className)} {...props}>
            <span className="flex size-4 items-center justify-center rounded-full bg-primary p-[3px]">
                <span className={indicatorVariants({ color })} />
            </span>
        </span>
    )
}
