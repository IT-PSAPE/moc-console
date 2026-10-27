import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'
import { Button } from '../../controls/button'

export function MessageBubbleAction({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button.Unstyled className={cn('flex min-h-9 w-full min-w-0 items-center justify-center rounded-md px-3 py-2 text-center text-sm font-medium leading-5 text-inherit disabled:cursor-default', className)} {...props}>{children}</Button.Unstyled>
}
