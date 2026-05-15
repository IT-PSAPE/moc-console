import { cn } from "@moc/utils/cn";
import { useCallback, type HTMLAttributes, type PointerEvent } from "react";
import { ScrollAreaScrollbarContext } from "./scroll-area-scrollbar-context";
import { useScrollArea, type ScrollAreaOrientation } from "./scroll-area-context";

type ScrollAreaScrollbarProps = HTMLAttributes<HTMLDivElement> & {
    forceMount?: boolean
    orientation?: ScrollAreaOrientation
}

export function ScrollAreaScrollbar({ children, className, forceMount = false, onPointerDown, orientation = "vertical", style, ...props }: ScrollAreaScrollbarProps) {
    const { actions, meta, state } = useScrollArea();
    const isVisible = orientation === "vertical" ? state.hasVerticalOverflow : state.hasHorizontalOverflow;
    const setScrollbarRef = useCallback((element: HTMLDivElement | null) => {
        actions.registerScrollbarElement(orientation, element);
    }, [actions, orientation]);

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        onPointerDown?.(event);

        if (event.defaultPrevented) {
            return;
        }

        actions.stepToPointer(orientation, event);
    }

    if (!isVisible && !forceMount) {
        return null;
    }

    return (
        <ScrollAreaScrollbarContext.Provider value={orientation}>
            <div
                className={cn(
                    "absolute rounded-full bg-secondary/70 p-0.5",
                    orientation === "vertical" ? "right-0 top-0" : "bottom-0 left-0",
                    className,
                )}
                data-orientation={orientation}
                onPointerDown={handlePointerDown}
                ref={setScrollbarRef}
                style={{
                    bottom: orientation === "vertical" && state.hasHorizontalOverflow ? meta.scrollbarSize : 0,
                    height: orientation === "horizontal" ? meta.scrollbarSize : undefined,
                    right: orientation === "horizontal" && state.hasVerticalOverflow ? meta.scrollbarSize : 0,
                    width: orientation === "vertical" ? meta.scrollbarSize : undefined,
                    ...style,
                }}
                {...props}
            >
                {children}
            </div>
        </ScrollAreaScrollbarContext.Provider>
    );
}
