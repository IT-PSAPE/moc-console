import { cn } from "@moc/utils/cn";
import type { InputHTMLAttributes, Ref } from "react";

type RangeProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    ref?: Ref<HTMLInputElement>
}

export function Range({ className, ref, ...props }: RangeProps) {
    return (
        <input
            ref={ref}
            type="range"
            className={cn(
                "h-11 w-full cursor-pointer appearance-none bg-transparent touch-manipulation",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                "disabled:cursor-not-allowed disabled:opacity-50 md:h-6",
                "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-quaternary",
                "[&::-webkit-slider-thumb]:-mt-1.25 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand_solid",
                "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-quaternary",
                "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-brand_solid",
                "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand_solid",
                className,
            )}
            {...props}
        />
    );
}
