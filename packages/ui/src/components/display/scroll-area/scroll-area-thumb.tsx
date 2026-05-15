import { cn } from "@moc/utils/cn";
import { useCallback, type HTMLAttributes, type PointerEvent } from "react";
import { useScrollAreaScrollbar } from "./scroll-area-scrollbar-context";
import { useScrollArea } from "./scroll-area-context";

type ScrollAreaThumbProps = HTMLAttributes<HTMLDivElement>

export function ScrollAreaThumb({ className, onPointerDown, style, ...props }: ScrollAreaThumbProps) {
    const orientation = useScrollAreaScrollbar();
    const { actions, state } = useScrollArea();
    const isVertical = orientation === "vertical";
    const size = isVertical ? state.verticalThumbSize : state.horizontalThumbSize;
    const offset = isVertical ? state.verticalThumbOffset : state.horizontalThumbOffset;
    const setThumbRef = useCallback((element: HTMLDivElement | null) => {
        actions.registerThumbElement(orientation, element);
    }, [actions, orientation]);

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        onPointerDown?.(event);

        if (event.defaultPrevented) {
            return;
        }

        actions.startThumbDrag(orientation, event);
    }

    return (
        <div
            className={cn(
                "absolute rounded-full bg-tertiary transition-colors hover:bg-secondary",
                state.isDragging && "bg-secondary",
                isVertical ? "left-0 right-0 top-0" : "bottom-0 left-0 top-0",
                className,
            )}
            data-orientation={orientation}
            onPointerDown={handlePointerDown}
            ref={setThumbRef}
            style={{
                height: isVertical ? size : undefined,
                transform: isVertical ? `translateY(${offset}px)` : `translateX(${offset}px)`,
                width: isVertical ? undefined : size,
                ...style,
            }}
            {...props}
        />
    );
}
