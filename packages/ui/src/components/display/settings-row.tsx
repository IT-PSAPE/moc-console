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
        <div className={cn("grid grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] items-start gap-6 py-2 portrait:grid-cols-1 portrait:gap-2", className)}>
            <div className="pt-1.5">
                <Label.sm className="block text-primary">{label}</Label.sm>
                {description && (
                    <Paragraph.xs className="text-tertiary pt-1">{description}</Paragraph.xs>
                )}
            </div>
            <div className="flex min-w-0 flex-1 justify-end">{children}</div>
        </div>
    )
}
