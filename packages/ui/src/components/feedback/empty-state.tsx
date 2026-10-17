import { cn } from '@moc/utils/cn'
import { Paragraph } from '@moc/ui/components/display/text'
import type { HTMLAttributes, ReactNode } from 'react'

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
    headingLevel?: 'h1' | 'h2' | 'h3'
}

export function EmptyState({ icon, title, description, action, headingLevel = 'h2', className, ...props }: EmptyStateProps) {
    const Heading = headingLevel
    return (
        <div className={cn('mx-auto flex max-w-sm flex-col items-center justify-center gap-2 py-12 text-center', className)} {...props}>
            {icon && (
                <span className="mb-2 flex size-10 items-center justify-center rounded-lg border border-secondary bg-primary text-tertiary shadow-xs *:size-5">
                    {icon}
                </span>
            )}
            <Heading className="label-sm text-primary">{title}</Heading>
            {description && <Paragraph.sm className="text-tertiary">{description}</Paragraph.sm>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}
