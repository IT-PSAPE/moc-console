import { cn } from '@moc/utils/cn'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import type { HTMLAttributes, ReactNode } from 'react'

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center text-center gap-3 py-16', className)} {...props}>
            {icon && <span className="text-quaternary *:size-10">{icon}</span>}
            <div className="flex flex-col gap-1">
                <Label.sm className="text-secondary">{title}</Label.sm>
                {description && <Paragraph.sm className="text-tertiary">{description}</Paragraph.sm>}
            </div>
            {action && <div className="pt-2">{action}</div>}
        </div>
    )
}
