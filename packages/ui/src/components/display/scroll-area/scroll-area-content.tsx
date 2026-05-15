import { cn } from "@/utils/cn";
import { useCallback, type HTMLAttributes } from "react";
import { useScrollArea } from "./scroll-area-context";

type ScrollAreaContentProps = HTMLAttributes<HTMLDivElement>

export function ScrollAreaContent({ children, className, ...props }: ScrollAreaContentProps) {
    const { actions } = useScrollArea();
    const setContentRef = useCallback((element: HTMLDivElement | null) => {
        actions.registerContentElement(element);
    }, [actions]);

    return (
        <div className={cn("min-w-full", className)} ref={setContentRef} {...props}>
            {children}
        </div>
    );
}
