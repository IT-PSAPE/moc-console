import { cn } from "@moc/utils/cn"
import type { ReactNode } from "react"
import { Label, Paragraph } from "./text"

type SettingsRowProps = {
    label: ReactNode
    description?: ReactNode
    children: ReactNode
    className?: string
}

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
    return (
        <div className={cn("grid gap-2 py-2 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] sm:items-start sm:gap-6", className)}>
            <div className="pt-1.5">
                <Label.sm className="block text-primary">{label}</Label.sm>
                {description && (
                    <Paragraph.xs className="text-tertiary pt-1">{description}</Paragraph.xs>
                )}
            </div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    )
}
