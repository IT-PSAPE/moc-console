import { cn } from "@moc/utils/cn";
import type { ProgressHTMLAttributes, Ref } from "react";

type ProgressProps = Omit<ProgressHTMLAttributes<HTMLProgressElement>, "max" | "value"> & {
    max: number
    ref?: Ref<HTMLProgressElement>
    value: number
}

export function Progress({ className, max, ref, value, ...props }: ProgressProps) {
    return (
        <progress
            ref={ref}
            className={cn(
                "h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-quaternary text-brand_solid",
                "[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-quaternary",
                "[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-brand_solid",
                "[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-brand_solid",
                className,
            )}
            max={max}
            value={value}
            {...props}
        />
    );
}
