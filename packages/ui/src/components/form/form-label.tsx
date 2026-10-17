import type { ReactNode } from "react";
import { cn } from "@moc/utils/cn";
import { Label as TextLabel } from "@moc/ui/components/display/text";

type LabelProps = {
    label: string
    htmlFor?: string
    required?: boolean
    optional?: boolean
    disabled?: boolean
    className?: string
}

type FormFieldProps = LabelProps & {
    children: ReactNode
    fieldClassName?: string
}

export function FormField({ label, htmlFor, required, optional, disabled, className, fieldClassName, children }: FormFieldProps) {
    return (
        <div className={cn("flex flex-col gap-1.5", fieldClassName)}>
            <FormLabel label={label} htmlFor={htmlFor} required={required} optional={optional} disabled={disabled} className={className} />
            {children}
        </div>
    )
}

export function FormLabel({ label, htmlFor, required, optional, disabled, className }: LabelProps) {
    return (
        <label htmlFor={htmlFor} className={cn("flex justify-start items-center gap-0.5", className)}>
            <TextLabel.sm className={cn("font-medium text-secondary", disabled && "text-quaternary")}>{label}</TextLabel.sm>
            {required && <TextLabel.sm className="font-medium text-brand">*</TextLabel.sm>}
            {optional && <TextLabel.sm className="font-medium text-quaternary">(Optional)</TextLabel.sm>}
        </label>
    )
}
