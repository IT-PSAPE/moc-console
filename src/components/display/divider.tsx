import { cn } from "@/utils/cn";
import type { HTMLAttributes } from "react";

export function Divider({ className }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full flex flex-col items-start p-0.5", className)}>
            <div className="w-full h-px bg-border-secondary" />
        </div>
    )
}