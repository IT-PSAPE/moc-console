import { cn } from "@moc/utils/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    children?: ReactNode
}

export function Radio({ children, className, ...props }: RadioProps) {
    return (
        <label className={cn("group flex w-fit items-center gap-1.5 has-[:disabled]:cursor-not-allowed", className)}>
            <span className="relative inline-flex shrink-0">
                <input {...props} type="radio" className="peer sr-only" />
                <span
                    aria-hidden="true"
                    className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
                        "border-secondary bg-primary transition-colors",
                        "group-hover:border-brand",
                        "peer-focus-visible:border-brand peer-focus-visible:ring-3 peer-focus-visible:ring-border-brand/10",
                        "peer-checked:border-brand peer-checked:bg-brand_solid",
                        "peer-checked:[&>span]:opacity-100",
                        "peer-disabled:border-disabled peer-disabled:bg-disabled",
                    )}
                >
                    <span className="size-2 rounded-full bg-primary opacity-0 transition-opacity" />
                </span>
            </span>
            {children}
        </label>
    );
}
