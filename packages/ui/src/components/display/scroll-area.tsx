import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "@moc/utils/cn";
import type { ComponentProps } from "react";

type Styled<Props> = Omit<Props, "className"> & { className?: string };

function ScrollAreaRoot({ className, ...props }: Styled<ComponentProps<typeof BaseScrollArea.Root>>) {
    return <BaseScrollArea.Root className={cn("relative min-h-0 min-w-0 overflow-hidden", className)} {...props} />;
}

function ScrollAreaViewport({ className, ...props }: Styled<ComponentProps<typeof BaseScrollArea.Viewport>>) {
    return <BaseScrollArea.Viewport className={cn("scrollbar-hidden h-full w-full overflow-auto", className)} {...props} />;
}

function ScrollAreaContent({ className, ...props }: Styled<ComponentProps<typeof BaseScrollArea.Content>>) {
    return <BaseScrollArea.Content className={cn("min-w-full", className)} {...props} />;
}

function ScrollAreaScrollbar({ className, orientation = "vertical", ...props }: Styled<ComponentProps<typeof BaseScrollArea.Scrollbar>>) {
    return (
        <BaseScrollArea.Scrollbar
            orientation={orientation}
            className={cn(
                "absolute rounded-full bg-secondary/70 p-0.5",
                orientation === "vertical" ? "right-0 top-0 h-full w-2.5" : "bottom-0 left-0 h-2.5 w-full",
                className,
            )}
            {...props}
        />
    );
}

function ScrollAreaThumb({ className, ...props }: Styled<ComponentProps<typeof BaseScrollArea.Thumb>>) {
    return <BaseScrollArea.Thumb className={cn("rounded-full bg-tertiary transition-colors hover:bg-secondary data-[scrolling]:bg-secondary", className)} {...props} />;
}

function ScrollAreaCorner({ className, ...props }: Styled<ComponentProps<typeof BaseScrollArea.Corner>>) {
    return <BaseScrollArea.Corner className={cn("absolute bottom-0 right-0 size-2.5 rounded-tl-full bg-secondary/70", className)} {...props} />;
}

export const ScrollArea = Object.assign(ScrollAreaRoot, {
    Content: ScrollAreaContent,
    Corner: ScrollAreaCorner,
    Scrollbar: ScrollAreaScrollbar,
    Thumb: ScrollAreaThumb,
    Viewport: ScrollAreaViewport,
});
