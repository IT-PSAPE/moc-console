import { Separator } from "@base-ui/react/separator";
import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";

export function Divider({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <Separator className={cn("my-0.5 h-px w-full bg-border-secondary", className)} {...props} />
    )
}
