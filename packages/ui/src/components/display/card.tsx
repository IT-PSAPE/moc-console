import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";

function CardRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border border-secondary bg-primary", className)} {...props}>
            {children}
        </div>
    )
}
function CardHeader({ children, className, tight = false, ...props }: HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
    return (
        <div className={cn("flex min-h-8 items-center gap-2 p-3", !tight && "landscape:flex-col landscape:items-start", className)} {...props}>
            {children}
        </div>
    )
}
function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("min-w-0 border-t border-secondary first:border-t-0", className)} {...props}>
            {children}
        </div>
    )
}

export const Card = Object.assign(CardRoot, {
    Header: CardHeader,
    Content: CardContent,
})
