import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function MessageBubbleContent({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return <article className={cn("relative min-w-0 rounded-xl rounded-bl-none bg-primary px-3 py-2 text-primary before:absolute before:bottom-0 before:-left-2 before:size-2 before:rounded-bl-lg before:bg-inherit before:content-['']", className)} {...props}>{children}</article>
}
