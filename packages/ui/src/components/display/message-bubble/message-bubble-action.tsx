import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'
import { Button } from '../../controls/button'

export function MessageBubbleAction({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button.Unstyled className={cn('min-h-9 min-w-0 rounded-md bg-primary/70 px-3 py-2 text-center text-sm font-medium leading-5 text-inherit disabled:cursor-default', className)} {...props}>{children}</Button.Unstyled>
}
