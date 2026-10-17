import { Select as BaseSelect } from "@base-ui/react/select";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { Check, ChevronDown } from "lucide-react";
import { createContext, useContext, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useIsLandscape } from "../../hooks/use-is-landscape";
import { Drawer } from "../overlays/drawer";
import { mobileSheetPositionerClassName } from "../overlays/mobile-sheet";
import { useOverlayStack } from "../overlays/overlay-provider";

type SelectRootProps<Value> = Omit<BaseSelect.Root.Props<Value, false>, "onOpenChange"> & {
    onOpenChange?: (nextOpen: boolean, eventDetails?: BaseSelect.Root.ChangeEventDetails) => void;
};
type Styled<Props> = Omit<Props, "className"> & { className?: string };
const SelectContext = createContext({ isLandscape: false });

function SelectRoot<Value>({ defaultOpen, onOpenChange, open, ...props }: SelectRootProps<Value>) {
    const isLandscape = useIsLandscape();
    const triggerRef = useRef<HTMLElement | null>(null);
    const isControlled = open !== undefined;
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
    const isOpen = isControlled ? open : uncontrolledOpen;
    function handleOpenChange(nextOpen: boolean, eventDetails: BaseSelect.Root.ChangeEventDetails) {
        if (nextOpen) triggerRef.current = eventDetails.trigger instanceof HTMLElement ? eventDetails.trigger : null;
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen, eventDetails);
    }

    function handleDrawerOpenChange(nextOpen: boolean) {
        if (nextOpen === isOpen) return;
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    }

    const select = (
        <SelectContext.Provider value={{ isLandscape }}>
            <BaseSelect.Root {...props} modal={isLandscape ? false : props.modal} open={isOpen} onOpenChange={handleOpenChange} />
        </SelectContext.Provider>
    );

    if (!isLandscape) return select;

    return <Drawer mobileSide="bottom" open={isOpen} onOpenChange={handleDrawerOpenChange} triggerRef={triggerRef}>{select}</Drawer>;
}

type SelectTriggerProps = Omit<ComponentProps<typeof BaseSelect.Trigger>, "children" | "className"> & {
    children?: ReactNode
    className?: string
    placeholder?: ReactNode
    size?: "sm" | "md"
    state?: "active" | "inactive"
    style?: "outline" | "ghost"
};

const triggerVariants = cv({
    base: [
        "relative flex w-full items-center gap-2 rounded-lg text-left text-primary paragraph-sm !leading-none",
        "transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:text-quaternary",
        "focus-within:outline-none focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/20",
        "aria-invalid:border-error aria-invalid:focus-within:ring-border-error/20",
    ],
    variants: {
        state: {
            active: [""],
            inactive: [""],
        },
        style: {
            outline: [
                "bg-primary border border-primary shadow-xs",
                "data-[disabled]:border-primary data-[disabled]:bg-tertiary",
            ],
            ghost: [
                "bg-transparent border border-transparent shadow-none",
                "hover:bg-secondary focus-within:bg-primary",
            ],
        },
        size: {
            sm: ["h-control-sm px-2.5 landscape:h-control-lg"],
            md: ["h-control px-3 landscape:h-control-lg"],
        },
    },
    defaultVariants: {
        size: "md",
        state: "inactive",
        style: "outline",
    },
});

function SelectTrigger({ children, className, placeholder, size, state, style = "outline", ...props }: SelectTriggerProps) {
    return (
        <BaseSelect.Trigger data-ui-control className={cn(triggerVariants({ size, state, style }), className)} {...props}>
            {children ?? (
                <>
                    <BaseSelect.Value className="min-w-0 flex-1 truncate" placeholder={placeholder} />
                    <BaseSelect.Icon className="shrink-0 text-quaternary">
                        <ChevronDown className="size-4" />
                    </BaseSelect.Icon>
                </>
            )}
        </BaseSelect.Trigger>
    );
}

function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
    const { isLandscape } = useContext(SelectContext);
    const { state: overlayState } = useOverlayStack();

    return (
        isLandscape ? (
            <Drawer.Portal>
                <Drawer.Backdrop />
                <BaseSelect.Portal container={overlayState.rootElement ?? undefined}>
                    <BaseSelect.Positioner alignItemWithTrigger={false} className={mobileSheetPositionerClassName}>
                        <Drawer.Panel>
                            <Drawer.Content className="overflow-hidden !pb-0">
                                <BaseSelect.Popup className="flex min-h-0 flex-1 flex-col outline-none">
                                    <BaseSelect.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
                                        {children}
                                    </BaseSelect.List>
                                </BaseSelect.Popup>
                            </Drawer.Content>
                        </Drawer.Panel>
                    </BaseSelect.Positioner>
                </BaseSelect.Portal>
            </Drawer.Portal>
        ) : (
            <BaseSelect.Portal container={overlayState.rootElement ?? undefined}>
                <BaseSelect.Positioner alignItemWithTrigger={false} sideOffset={6} className="z-[9050] outline-none">
                    <BaseSelect.Popup
                        className={cn(
                            "pointer-events-auto max-h-[min(var(--available-height),16rem)] min-w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-lg border border-secondary bg-primary shadow-lg outline-none",
                            "origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
                            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
                            className,
                        )}
                    >
                        <BaseSelect.List className="max-h-[inherit] overflow-y-auto overscroll-contain p-1">
                            {children}
                        </BaseSelect.List>
                    </BaseSelect.Popup>
                </BaseSelect.Positioner>
            </BaseSelect.Portal>
        )
    );
}

function SelectItem({ children, className, description, ...props }: Styled<ComponentProps<typeof BaseSelect.Item>> & { description?: string | null }) {
    return (
        <BaseSelect.Item
            className={cn(
                "group flex h-control landscape:h-control-lg w-full cursor-default items-center gap-2 rounded-md px-2.5 label-sm font-medium text-secondary outline-none",
                "data-[highlighted]:bg-secondary data-[highlighted]:text-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                className,
            )}
            {...props}
        >
            <span className="flex min-w-0 flex-1 flex-col justify-center">
                <BaseSelect.ItemText className="truncate">{children}</BaseSelect.ItemText>
                {description && <span className="paragraph-xs whitespace-normal text-tertiary">{description}</span>}
            </span>
            <BaseSelect.ItemIndicator keepMounted className="flex size-4 shrink-0 items-center justify-center opacity-0 group-data-[selected]:opacity-100">
                <Check className="size-4 text-brand" />
            </BaseSelect.ItemIndicator>
        </BaseSelect.Item>
    );
}

export const Select = {
    Content: SelectContent,
    Item: SelectItem,
    Root: SelectRoot,
    Trigger: SelectTrigger,
};
