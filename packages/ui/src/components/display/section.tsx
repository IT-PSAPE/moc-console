import { cn } from "@moc/utils/cn"
import type { HTMLAttributes, ReactNode } from "react"
import { Label, Paragraph } from "./text"

function SectionRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("py-2", className)} {...props}>
            {children}
        </div>
    )
}

type SectionHeaderProps = {
    title: ReactNode
    description?: ReactNode
    className?: string
}

function SectionHeader({ title, description, className }: SectionHeaderProps) {
    return (
        <div className={cn("pb-3", className)}>
            <Label.md className="block">{title}</Label.md>
            {description && (
                <Paragraph.xs className="text-tertiary pt-1">{description}</Paragraph.xs>
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
