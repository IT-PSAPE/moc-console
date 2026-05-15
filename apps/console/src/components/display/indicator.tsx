import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
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
            yellow: ['bg-utility-yellow-500'],
            green: ['bg-utility-green-500'],
            red: ['bg-utility-red-500'],
            blue: ['bg-utility-blue-500'],
            gray: ['bg-utility-gray-500'],
            purple: ['bg-utility-purple-500'],
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
