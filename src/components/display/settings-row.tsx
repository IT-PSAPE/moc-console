import { cn } from "@/utils/cn"
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
        <div className={cn("flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-6", className)}>
            <div className="sm:w-60 sm:shrink-0">
                <Label.sm className="block text-primary">{label}</Label.sm>
                {description && (
                    <Paragraph.xs className="text-tertiary pt-1">{description}</Paragraph.xs>
                )}
            </div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    )
}
