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
        <div className={cn('flex flex-col items-center justify-center text-center gap-3 py-16', className)} {...props}>
            {icon && <span className="text-quaternary *:size-10">{icon}</span>}
            <div className="flex flex-col gap-1">
                <Heading className="label-sm text-secondary">{title}</Heading>
                {description && <Paragraph.sm className="text-tertiary">{description}</Paragraph.sm>}
            </div>
            {action && <div className="pt-2">{action}</div>}
        </div>
    )
}
