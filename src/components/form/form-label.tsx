import { cn } from "@/utils/cn";
import { Paragraph, Label as TextLabel } from "../display/text";

type LabelProps = {
    label: string
    required?: boolean
    optional?: boolean
    disabled?: boolean
    info?: boolean
    className?: string
}

export function FormLabel({ label, required, optional, info, className }: LabelProps) {
    return (
        <span className={cn("flex justify-start items-center gap-0.5", className)}>
            <TextLabel.xs className="text-primary">{label}</TextLabel.xs>
            {required && <TextLabel.xs  className="text-brand_secondary">*</TextLabel.xs>}
            {optional && <Paragraph.xs className="text-quaternary">(Option)</Paragraph.xs>}

            {info && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="block size-4 text-quaternary">
                <path d="M8.00024 1.33325C11.682 1.33343 14.6663 4.31845 14.6663 8.00024C14.6661 11.6819 11.6819 14.6661 8.00024 14.6663C4.31845 14.6663 1.33343 11.682 1.33325 8.00024C1.33325 4.31835 4.31835 1.33325 8.00024 1.33325ZM8.00024 7.33325C7.63216 7.33325 7.33343 7.6322 7.33325 8.00024V10.6663C7.33343 11.0343 7.63216 11.3333 8.00024 11.3333C8.36818 11.3331 8.66706 11.0342 8.66724 10.6663V8.00024C8.66706 7.63231 8.36818 7.33343 8.00024 7.33325ZM8.00024 4.66626C7.63216 4.66626 7.33343 4.96521 7.33325 5.33325C7.33343 5.70129 7.63216 6.00024 8.00024 6.00024H8.00708C8.37493 5.99998 8.67292 5.70113 8.6731 5.33325C8.67292 4.96538 8.37493 4.66653 8.00708 4.66626H8.00024Z" fill="#999999" />
            </svg>}
        </span>
    )
}