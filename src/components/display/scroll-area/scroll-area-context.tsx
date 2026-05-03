import { createContext, useContext } from "react";

export type ScrollAreaOrientation = "horizontal" | "vertical";

export type ScrollAreaState = {
    hasHorizontalOverflow: boolean
    hasVerticalOverflow: boolean
    horizontalThumbOffset: number
    horizontalThumbSize: number
    verticalThumbOffset: number
    verticalThumbSize: number
    isDragging: boolean
}

type ScrollAreaActions = {
    handleViewportScroll: () => void
    measure: () => void
    registerContentElement: (element: HTMLDivElement | null) => void
    registerScrollbarElement: (orientation: ScrollAreaOrientation, element: HTMLDivElement | null) => void
    registerThumbElement: (orientation: ScrollAreaOrientation, element: HTMLDivElement | null) => void
    registerViewportElement: (element: HTMLDivElement | null) => void
    startThumbDrag: (orientation: ScrollAreaOrientation, event: React.PointerEvent<HTMLDivElement>) => void
    stepToPointer: (orientation: ScrollAreaOrientation, event: React.PointerEvent<HTMLDivElement>) => void
}

type ScrollAreaMeta = {
    scrollbarSize: number
    thumbMinSize: number
}

export type ScrollAreaContextValue = {
    actions: ScrollAreaActions
    meta: ScrollAreaMeta
    state: ScrollAreaState
}

export const ScrollAreaContext = createContext<ScrollAreaContextValue | null>(null);

export function useScrollArea() {
    const context = useContext(ScrollAreaContext);

    if (!context) {
        throw new Error("useScrollArea must be used within a ScrollArea.Root");
    }

    return context;
}
