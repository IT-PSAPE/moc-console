import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";

function CardRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs", className)} {...props}>
            {children}
        </div>
    )
}
// Header title should be a `Label.sm` (not `Label.md` — that reads as a
// page-level section title); description `Paragraph.xs text-tertiary`.
function CardHeader({ children, className, tight = false, ...props }: HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
    return (
        <div className={cn("flex min-h-12 items-center gap-2 border-b border-secondary px-4 py-3", !tight && "landscape:flex-col landscape:items-start", className)} {...props}>
            {children}
        </div>
    )
}
// A "row" (e.g. a list of rows stacked in one Card.Content) should use
// `px-4 py-3`; stack multiple Card.Content blocks for distinct sections —
// each sibling after the first gets a top border.
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
