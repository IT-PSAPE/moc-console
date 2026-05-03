import { cn } from "@/utils/cn";
import type { HTMLAttributes } from "react";

function CardRoot({ children, className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col gap-1.5 p-1.5 rounded-lg border border-tertiary bg-secondary_alt", className)}>
            {children}
        </div>
    )
}
function CardHeader({ children, className, tight = false }: HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
    return (
        <div className={cn("min-h-8 px-1.5 flex items-center", !tight && "max-mobile:flex-col max-mobile:items-start", className)}>
            {children}
        </div>
    )
}
function CardContent({ children, className, ghost = false }: HTMLAttributes<HTMLDivElement> & { ghost?: boolean }) {
    return (
        <div className={cn(!ghost && "bg-primary rounded-md border border-tertiary", className)}>
            {children}
        </div>
    )
}

export const Card = {
    Root: CardRoot,
    Header: CardHeader,
    Content: CardContent,
}