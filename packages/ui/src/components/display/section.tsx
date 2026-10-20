import { cn } from "@moc/utils/cn"
import type { HTMLAttributes, ReactNode } from "react"
import { Label, Paragraph } from "./text"

// No default padding — consumers stack sections with their own `gap-8`.
function SectionRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn(className)} {...props}>
            {children}
        </div>
    )
}

type SectionHeaderProps = {
    title: ReactNode
    description?: ReactNode
    className?: string
    actions?: ReactNode
    /**
     * `md` (default) for page-level sections (Settings "General", Members
     * "Directory"); `sm` for a section inside a card, drawer, modal or detail
     * page — see docs/design-system.md §5.
     */
    size?: "md" | "sm"
}

function SectionHeader({ title, description, className, actions, size = "md" }: SectionHeaderProps) {
    const Title = size === "sm" ? Label.sm : Label.md
    const Description = size === "sm" ? Paragraph.xs : Paragraph.sm
    return (
        <div className={cn("flex flex-col gap-1 pb-3", className)}>
            <div className="flex items-center justify-between gap-3">
                <Title className="block text-primary">{title}</Title>
                {actions}
            </div>
            {description && (
                <Description className="text-tertiary">{description}</Description>
            )}
        </div>
    )
}

function SectionBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col", className)} {...props}>
            {children}
        </div>
    )
}

export const Section = Object.assign(SectionRoot, {
    Header: SectionHeader,
    Body: SectionBody,
})
