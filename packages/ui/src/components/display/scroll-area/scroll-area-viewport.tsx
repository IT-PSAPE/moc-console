import { cn } from "@/utils/cn";
import { useCallback, type HTMLAttributes, type UIEvent } from "react";
import { useScrollArea } from "./scroll-area-context";

type ScrollAreaViewportProps = HTMLAttributes<HTMLDivElement>

export function ScrollAreaViewport({ children, className, onScroll, ...props }: ScrollAreaViewportProps) {
    const { actions } = useScrollArea();
    const setViewportRef = useCallback((element: HTMLDivElement | null) => {
        actions.registerViewportElement(element);
    }, [actions]);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        onScroll?.(event);
        actions.handleViewportScroll();
    }

    return (
        <div
            className={cn("scrollbar-hidden h-full w-full overflow-auto", className)}
            onScroll={handleScroll}
            ref={setViewportRef}
            {...props}
        >
            {children}
        </div>
    );
}
