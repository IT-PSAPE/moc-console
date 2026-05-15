import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";
import { Check, Minus } from "lucide-react";
import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
    children?: ReactNode
    indeterminate?: boolean
}

const checkboxControlVariants = cv({
    base: [
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border",
        "bg-primary text-primary_on-brand transition-colors",
        "border-secondary group-hover:border-brand",
        "peer-focus-visible:border-brand peer-focus-visible:ring-3 peer-focus-visible:ring-border-brand/10",
        "peer-checked:border-brand peer-checked:bg-brand_solid",
        "peer-indeterminate:border-brand peer-indeterminate:bg-brand_solid",
        "peer-disabled:border-disabled peer-disabled:bg-disabled",
        "peer-disabled:group-hover:border-disabled peer-disabled:group-hover:bg-disabled",
        "peer-disabled:text-foreground-disabled",
        "peer-checked:[&_[data-checkbox-icon=check]]:opacity-100",
        "peer-indeterminate:[&_[data-checkbox-icon=check]]:opacity-0",
        "peer-indeterminate:[&_[data-checkbox-icon=minus]]:opacity-100",
    ],
});

export function Checkbox({ children, className, indeterminate = false, ...props }: CheckboxProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!inputRef.current) {
            return;
        }

        inputRef.current.indeterminate = indeterminate && !inputRef.current.checked;
    }, [indeterminate, props.checked]);

    return (
        <label className={cn("group flex w-fit items-start gap-1.5 has-[:disabled]:cursor-not-allowed *:even:mt-0.75", className)}>
            <span className="relative inline-flex shrink-0">
                <input {...props} ref={inputRef} type="checkbox" aria-checked={indeterminate ? "mixed" : undefined} className="peer sr-only" />
                <span className={checkboxControlVariants()} aria-hidden="true">
                    {indeterminate ? <Minus className="size-4" /> : <Check className="size-4" />}
                </span>
            </span>
            {children}
        </label>
    );
}
