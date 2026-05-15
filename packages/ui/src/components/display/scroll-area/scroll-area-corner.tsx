import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";
import { useScrollArea } from "./scroll-area-context";

type ScrollAreaCornerProps = HTMLAttributes<HTMLDivElement>

export function ScrollAreaCorner({ className, style, ...props }: ScrollAreaCornerProps) {
    const { meta, state } = useScrollArea();

    if (!state.hasHorizontalOverflow || !state.hasVerticalOverflow) {
        return null;
    }

    return (
        <div
            className={cn("absolute bottom-0 right-0 rounded-tl-full bg-secondary/70", className)}
            style={{
                height: meta.scrollbarSize,
                width: meta.scrollbarSize,
                ...style,
            }}
            {...props}
        />
    );
}
