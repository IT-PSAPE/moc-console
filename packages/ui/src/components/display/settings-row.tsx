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
        <div className={cn("grid grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] items-center gap-6 px-4 py-3 portrait:grid-cols-1 portrait:gap-2", className)}>
            <div className="min-w-0">
                <Label.sm className="block text-primary">{label}</Label.sm>
                {description && (
                    <Paragraph.xs className="text-tertiary">{description}</Paragraph.xs>
                )}
            </div>
            <div className="flex min-w-0 justify-end [&>*]:max-w-sm">{children}</div>
        </div>
    )
}
