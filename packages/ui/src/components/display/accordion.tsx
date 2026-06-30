import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";

// ─── Root ───────────────────────────────────────────────

type AccordionRootProps = HTMLAttributes<HTMLDivElement> & {
    type?: "single" | "multiple";
    defaultValue?: string | string[];
};

function AccordionRoot({ type = "single", defaultValue, children, className, ...props }: AccordionRootProps) {
    const defaultArray = defaultValue === undefined ? undefined : Array.isArray(defaultValue) ? defaultValue : [defaultValue];

    return (
        <BaseAccordion.Root multiple={type === "multiple"} defaultValue={defaultArray} className={cn(className)} {...props}>
            {children}
        </BaseAccordion.Root>
    );
}

// ─── Item ───────────────────────────────────────────────

type AccordionItemProps = HTMLAttributes<HTMLDivElement> & {
    value: string;
};

function AccordionItem({ value, children, className, ...props }: AccordionItemProps) {
    return (
        <BaseAccordion.Item value={value} className={cn(className)} {...props}>
            {children}
        </BaseAccordion.Item>
    );
}

// ─── Trigger ────────────────────────────────────────────
//
// Wrapped in Base UI's Header for correct heading semantics. The `group` class
// lets descendants react to the trigger's `data-panel-open` state, e.g. a
// chevron with `group-data-[panel-open]:rotate-180`.

type AccordionTriggerProps = HTMLAttributes<HTMLButtonElement>;

function AccordionTrigger({ children, className, ...props }: AccordionTriggerProps) {
    return (
        <BaseAccordion.Header className="m-0">
            <BaseAccordion.Trigger className={cn("group w-full cursor-pointer", className)} {...props}>
                {children}
            </BaseAccordion.Trigger>
        </BaseAccordion.Header>
    );
}

// ─── Content ────────────────────────────────────────────
//
// Base UI exposes the resting height as `--accordion-panel-height`, letting the
// collapse animate via CSS height (replacing the previous grid-rows trick).

type AccordionContentProps = HTMLAttributes<HTMLDivElement>;

function AccordionContent({ children, className, ...props }: AccordionContentProps) {
    return (
        <BaseAccordion.Panel
            className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[starting-style]:h-0 data-[ending-style]:h-0"
            {...props}
        >
            <div className={cn(className)}>{children}</div>
        </BaseAccordion.Panel>
    );
}

// ─── Compound Export ────────────────────────────────────

export const Accordion = Object.assign(AccordionRoot, {
    Item: AccordionItem,
    Trigger: AccordionTrigger,
    Content: AccordionContent,
});
