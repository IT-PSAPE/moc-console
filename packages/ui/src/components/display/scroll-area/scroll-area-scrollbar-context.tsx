import { createContext, useContext } from "react";
import type { ScrollAreaOrientation } from "./scroll-area-context";

export const ScrollAreaScrollbarContext = createContext<ScrollAreaOrientation | null>(null);

export function useScrollAreaScrollbar() {
    const context = useContext(ScrollAreaScrollbarContext);

    if (!context) {
        throw new Error("useScrollAreaScrollbar must be used within a ScrollArea.Scrollbar");
    }

    return context;
}
