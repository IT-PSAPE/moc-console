import { Select as BaseSelect } from "@base-ui/react/select";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { ChevronDown } from "lucide-react";
import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { useIsMobile } from "../../hooks/use-is-mobile";
import { Drawer } from "../overlays/drawer";
import { mobileSheetPositionerClassName } from "../overlays/mobile-sheet";
import { useOverlayStack } from "../overlays/overlay-provider";

type SelectRootProps<Value> = Omit<BaseSelect.Root.Props<Value, false>, "onOpenChange"> & {
    onOpenChange?: (nextOpen: boolean, eventDetails?: BaseSelect.Root.ChangeEventDetails) => void;
};
type Styled<Props> = Omit<Props, "className"> & { className?: string };
const SelectContext = createContext({ isMobile: false });

function SelectRoot<Value>({ defaultOpen, onOpenChange, open, ...props }: SelectRootProps<Value>) {
    const isMobile = useIsMobile();
    const isControlled = open !== undefined;
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
    const isOpen = isControlled ? open : uncontrolledOpen;
    function handleOpenChange(nextOpen: boolean, eventDetails: BaseSelect.Root.ChangeEventDetails) {
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
        <SelectContext.Provider value={{ isMobile }}>
            <BaseSelect.Root {...props} modal={isMobile ? false : props.modal} open={isOpen} onOpenChange={handleOpenChange} />
        </SelectContext.Provider>
    );

    if (!isMobile) return select;

    return <Drawer mobileSide="bottom" open={isOpen} onOpenChange={handleDrawerOpenChange}>{select}</Drawer>;
}

type SelectTriggerProps = Omit<ComponentProps<typeof BaseSelect.Trigger>, "children" | "className"> & {
    children?: ReactNode
    className?: string
    placeholder?: ReactNode
    state?: "active" | "inactive"
    style?: "outline" | "ghost"
};

const triggerVariants = cv({
    base: [
        "relative flex min-h-11 w-full items-center gap-1.5 text-left paragraph-sm !leading-none md:min-h-0",
        "bg-secondary data-[disabled]:cursor-not-allowed data-[disabled]:bg-disabled",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-border-brand/10",
    ],
    variants: {
        state: {
            active: [""],
            inactive: [""],
        },
        style: {
            outline: [
                "rounded-lg border border-secondary px-3 py-2",
                "focus-visible:border-brand data-[disabled]:border-disabled",
            ],
            ghost: ["rounded-md px-2 py-1.5"],
        },
    },
    defaultVariants: {
        state: "inactive",
        style: "outline",
    },
});

function SelectTrigger({ children, className, placeholder, state, style = "outline", ...props }: SelectTriggerProps) {
    return (
        <BaseSelect.Trigger data-ui-control className={cn(triggerVariants({ state, style }), className)} {...props}>
            {children ?? (
                <>
                    <BaseSelect.Value className="min-w-0 flex-1 truncate" placeholder={placeholder} />
                    <BaseSelect.Icon className="shrink-0 text-tertiary">
                        <ChevronDown className="size-4" />
                    </BaseSelect.Icon>
                </>
            )}
        </BaseSelect.Trigger>
    );
}

function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
    const { isMobile } = useContext(SelectContext);
    const { state: overlayState } = useOverlayStack();

    return (
        isMobile ? (
            <Drawer.Portal>
                <Drawer.Backdrop />
                <BaseSelect.Positioner alignItemWithTrigger={false} className={mobileSheetPositionerClassName}>
                    <Drawer.Panel render={<BaseSelect.Popup />}>
                        <BaseSelect.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
                            {children}
                        </BaseSelect.List>
                    </Drawer.Panel>
                </BaseSelect.Positioner>
            </Drawer.Portal>
        ) : (
            <BaseSelect.Portal container={overlayState.rootElement ?? undefined}>
                <BaseSelect.Positioner alignItemWithTrigger={false} sideOffset={6} className="z-[9050] outline-none">
                    <BaseSelect.Popup
                        className={cn(
                            "pointer-events-auto max-h-[min(var(--available-height),16rem)] min-w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-xl border border-secondary bg-primary shadow-lg outline-none",
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

function SelectItem({ children, className, ...props }: Styled<ComponentProps<typeof BaseSelect.Item>>) {
    return (
        <BaseSelect.Item
            className={cn(
                "group flex min-h-11 w-full cursor-default items-center gap-2 rounded-lg px-4 py-2 paragraph-sm text-secondary outline-none md:min-h-0 md:px-3",
                "data-[highlighted]:bg-secondary data-[highlighted]:text-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                className,
            )}
            {...props}
        >
            <BaseSelect.ItemText className="min-w-0 flex-1 truncate">{children}</BaseSelect.ItemText>
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-secondary group-data-[selected]:border-brand">
                <BaseSelect.ItemIndicator keepMounted className="flex size-full items-center justify-center opacity-0 group-data-[selected]:opacity-100">
                    <span className="size-2 rounded-full bg-brand_solid" />
                </BaseSelect.ItemIndicator>
            </span>
        </BaseSelect.Item>
    );
}

export const Select = {
    Content: SelectContent,
    Item: SelectItem,
    Root: SelectRoot,
    Trigger: SelectTrigger,
};
