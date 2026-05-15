import { cn } from "@/utils/cn";
import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ScrollAreaContext, type ScrollAreaOrientation, type ScrollAreaState } from "./scroll-area-context";

type ScrollAreaRootProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
    scrollbarSize?: number
    thumbMinSize?: number
}

type DragState = {
    orientation: ScrollAreaOrientation
    pointerStart: number
    scrollStart: number
}

const DEFAULT_STATE: ScrollAreaState = {
    hasHorizontalOverflow: false,
    hasVerticalOverflow: false,
    horizontalThumbOffset: 0,
    horizontalThumbSize: 0,
    verticalThumbOffset: 0,
    verticalThumbSize: 0,
    isDragging: false,
};

const DEFAULT_SCROLLBAR_SIZE = 10;
const DEFAULT_THUMB_MIN_SIZE = 24;
const OVERFLOW_EPSILON = 1;

function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(Math.max(value, minimum), maximum);
}

function getPointerPosition(event: PointerEvent | ReactPointerEvent<HTMLDivElement>, orientation: ScrollAreaOrientation) {
    return orientation === "vertical" ? event.clientY : event.clientX;
}

function getTrackLength(element: HTMLDivElement | null, orientation: ScrollAreaOrientation) {
    if (!element) {
        return 0;
    }

    return orientation === "vertical" ? element.clientHeight : element.clientWidth;
}

export function ScrollAreaRoot({ children, className, scrollbarSize = DEFAULT_SCROLLBAR_SIZE, thumbMinSize = DEFAULT_THUMB_MIN_SIZE, ...props }: ScrollAreaRootProps) {
    const viewportElementRef = useRef<HTMLDivElement | null>(null);
    const contentElementRef = useRef<HTMLDivElement | null>(null);
    const verticalScrollbarElementRef = useRef<HTMLDivElement | null>(null);
    const horizontalScrollbarElementRef = useRef<HTMLDivElement | null>(null);
    const verticalThumbElementRef = useRef<HTMLDivElement | null>(null);
    const horizontalThumbElementRef = useRef<HTMLDivElement | null>(null);
    const [elementVersion, setElementVersion] = useState(0);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [state, setState] = useState<ScrollAreaState>(DEFAULT_STATE);

    const measure = useCallback(() => {
        const viewportElement = viewportElementRef.current;
        const horizontalScrollbarElement = horizontalScrollbarElementRef.current;
        const verticalScrollbarElement = verticalScrollbarElementRef.current;

        if (!viewportElement) {
            return;
        }

        const hasHorizontalOverflow = viewportElement.scrollWidth - viewportElement.clientWidth > OVERFLOW_EPSILON;
        const hasVerticalOverflow = viewportElement.scrollHeight - viewportElement.clientHeight > OVERFLOW_EPSILON;
        const horizontalTrackLength = getTrackLength(horizontalScrollbarElement, "horizontal") || Math.max(viewportElement.clientWidth - (hasVerticalOverflow ? scrollbarSize : 0), 0);
        const verticalTrackLength = getTrackLength(verticalScrollbarElement, "vertical") || Math.max(viewportElement.clientHeight - (hasHorizontalOverflow ? scrollbarSize : 0), 0);
        const maxScrollLeft = Math.max(viewportElement.scrollWidth - viewportElement.clientWidth, 0);
        const maxScrollTop = Math.max(viewportElement.scrollHeight - viewportElement.clientHeight, 0);
        const horizontalThumbSize = hasHorizontalOverflow ? clamp((viewportElement.clientWidth / viewportElement.scrollWidth) * horizontalTrackLength, thumbMinSize, horizontalTrackLength) : 0;
        const verticalThumbSize = hasVerticalOverflow ? clamp((viewportElement.clientHeight / viewportElement.scrollHeight) * verticalTrackLength, thumbMinSize, verticalTrackLength) : 0;
        const maxHorizontalThumbOffset = Math.max(horizontalTrackLength - horizontalThumbSize, 0);
        const maxVerticalThumbOffset = Math.max(verticalTrackLength - verticalThumbSize, 0);
        const horizontalThumbOffset = maxScrollLeft === 0 ? 0 : (viewportElement.scrollLeft / maxScrollLeft) * maxHorizontalThumbOffset;
        const verticalThumbOffset = maxScrollTop === 0 ? 0 : (viewportElement.scrollTop / maxScrollTop) * maxVerticalThumbOffset;

        setState((previousState) => {
            if (
                previousState.hasHorizontalOverflow === hasHorizontalOverflow &&
                previousState.hasVerticalOverflow === hasVerticalOverflow &&
                previousState.horizontalThumbOffset === horizontalThumbOffset &&
                previousState.horizontalThumbSize === horizontalThumbSize &&
                previousState.verticalThumbOffset === verticalThumbOffset &&
                previousState.verticalThumbSize === verticalThumbSize
            ) {
                return previousState;
            }

            return {
                ...previousState,
                hasHorizontalOverflow,
                hasVerticalOverflow,
                horizontalThumbOffset,
                horizontalThumbSize,
                verticalThumbOffset,
                verticalThumbSize,
            };
        });
    }, [scrollbarSize, thumbMinSize]);

    const bumpElementVersion = useCallback(() => {
        setElementVersion((previousVersion) => previousVersion + 1);
    }, []);

    const registerViewportElement = useCallback((element: HTMLDivElement | null) => {
        if (viewportElementRef.current === element) {
            return;
        }

        viewportElementRef.current = element;
        bumpElementVersion();
    }, [bumpElementVersion]);

    const registerContentElement = useCallback((element: HTMLDivElement | null) => {
        if (contentElementRef.current === element) {
            return;
        }

        contentElementRef.current = element;
        bumpElementVersion();
    }, [bumpElementVersion]);

    const registerScrollbarElement = useCallback((orientation: ScrollAreaOrientation, element: HTMLDivElement | null) => {
        if (orientation === "vertical") {
            if (verticalScrollbarElementRef.current === element) {
                return;
            }

            verticalScrollbarElementRef.current = element;
            bumpElementVersion();
            return;
        }

        if (horizontalScrollbarElementRef.current === element) {
            return;
        }

        horizontalScrollbarElementRef.current = element;
        bumpElementVersion();
    }, [bumpElementVersion]);

    const registerThumbElement = useCallback((orientation: ScrollAreaOrientation, element: HTMLDivElement | null) => {
        if (orientation === "vertical") {
            if (verticalThumbElementRef.current === element) {
                return;
            }

            verticalThumbElementRef.current = element;
            bumpElementVersion();
            return;
        }

        if (horizontalThumbElementRef.current === element) {
            return;
        }

        horizontalThumbElementRef.current = element;
        bumpElementVersion();
    }, [bumpElementVersion]);

    const handleViewportScroll = useCallback(() => {
        measure();
    }, [measure]);

    const scrollToRatio = useCallback((orientation: ScrollAreaOrientation, ratio: number) => {
        const viewportElement = viewportElementRef.current;

        if (!viewportElement) {
            return;
        }

        const clampedRatio = clamp(ratio, 0, 1);

        if (orientation === "vertical") {
            viewportElement.scrollTop = clampedRatio * Math.max(viewportElement.scrollHeight - viewportElement.clientHeight, 0);
            return;
        }

        viewportElement.scrollLeft = clampedRatio * Math.max(viewportElement.scrollWidth - viewportElement.clientWidth, 0);
    }, []);

    const stepToPointer = useCallback((orientation: ScrollAreaOrientation, event: ReactPointerEvent<HTMLDivElement>) => {
        const verticalScrollbarElement = verticalScrollbarElementRef.current;
        const horizontalScrollbarElement = horizontalScrollbarElementRef.current;
        const verticalThumbElement = verticalThumbElementRef.current;
        const horizontalThumbElement = horizontalThumbElementRef.current;
        const scrollbarElement = orientation === "vertical" ? verticalScrollbarElement : horizontalScrollbarElement;
        const thumbElement = orientation === "vertical" ? verticalThumbElement : horizontalThumbElement;
        const thumbSize = orientation === "vertical" ? state.verticalThumbSize : state.horizontalThumbSize;

        if (!scrollbarElement || !thumbElement) {
            return;
        }

        if (thumbElement.contains(event.target as Node)) {
            return;
        }

        const rect = scrollbarElement.getBoundingClientRect();
        const pointerPosition = getPointerPosition(event, orientation);
        const trackStart = orientation === "vertical" ? rect.top : rect.left;
        const trackLength = getTrackLength(scrollbarElement, orientation);
        const maxThumbOffset = Math.max(trackLength - thumbSize, 0);

        if (maxThumbOffset === 0) {
            return;
        }

        const centeredThumbOffset = clamp(pointerPosition - trackStart - thumbSize / 2, 0, maxThumbOffset);
        scrollToRatio(orientation, centeredThumbOffset / maxThumbOffset);
    }, [scrollToRatio, state.horizontalThumbSize, state.verticalThumbSize]);

    const startThumbDrag = useCallback((orientation: ScrollAreaOrientation, event: ReactPointerEvent<HTMLDivElement>) => {
        const viewportElement = viewportElementRef.current;

        if (!viewportElement) {
            return;
        }

        event.preventDefault();

        const scrollStart = orientation === "vertical" ? viewportElement.scrollTop : viewportElement.scrollLeft;

        setDragState({
            orientation,
            pointerStart: getPointerPosition(event, orientation),
            scrollStart,
        });
        setState((previousState) => ({ ...previousState, isDragging: true }));
    }, []);

    useEffect(() => {
        measure();
    }, [elementVersion, measure]);

    useEffect(() => {
        if (typeof ResizeObserver === "undefined") {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            measure();
        });

        if (viewportElementRef.current) {
            observer.observe(viewportElementRef.current);
        }

        if (contentElementRef.current) {
            observer.observe(contentElementRef.current);
        }

        if (verticalScrollbarElementRef.current) {
            observer.observe(verticalScrollbarElementRef.current);
        }

        if (horizontalScrollbarElementRef.current) {
            observer.observe(horizontalScrollbarElementRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [elementVersion, measure]);

    useEffect(() => {
        const currentDragState = dragState;
        const viewportElement = viewportElementRef.current;

        if (!currentDragState || !viewportElement) {
            return undefined;
        }

        const activeDragState = currentDragState;
        const activeViewportElement = viewportElement;

        function handlePointerMove(event: PointerEvent) {
            const scrollbarElement = activeDragState.orientation === "vertical" ? verticalScrollbarElementRef.current : horizontalScrollbarElementRef.current;
            const thumbSize = activeDragState.orientation === "vertical" ? state.verticalThumbSize : state.horizontalThumbSize;

            if (!scrollbarElement) {
                return;
            }

            const trackLength = getTrackLength(scrollbarElement, activeDragState.orientation);
            const maxThumbOffset = Math.max(trackLength - thumbSize, 0);

            if (maxThumbOffset === 0) {
                return;
            }

            const pointerDelta = getPointerPosition(event, activeDragState.orientation) - activeDragState.pointerStart;
            const viewportSize = activeDragState.orientation === "vertical" ? activeViewportElement.clientHeight : activeViewportElement.clientWidth;
            const contentSize = activeDragState.orientation === "vertical" ? activeViewportElement.scrollHeight : activeViewportElement.scrollWidth;
            const maxScroll = Math.max(contentSize - viewportSize, 0);

            if (maxScroll === 0) {
                return;
            }

            const nextScroll = clamp(activeDragState.scrollStart + (pointerDelta / maxThumbOffset) * maxScroll, 0, maxScroll);

            if (activeDragState.orientation === "vertical") {
                activeViewportElement.scrollTop = nextScroll;
                return;
            }

            activeViewportElement.scrollLeft = nextScroll;
        }

        function handlePointerUp() {
            setDragState(null);
            setState((previousState) => ({ ...previousState, isDragging: false }));
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dragState, state.horizontalThumbSize, state.verticalThumbSize]);

    const contextValue = useMemo(() => ({
        actions: {
            handleViewportScroll,
            measure,
            registerContentElement,
            registerScrollbarElement,
            registerThumbElement,
            registerViewportElement,
            startThumbDrag,
            stepToPointer,
        },
        meta: {
            scrollbarSize,
            thumbMinSize,
        },
        state,
    }), [handleViewportScroll, measure, registerContentElement, registerScrollbarElement, registerThumbElement, registerViewportElement, scrollbarSize, startThumbDrag, state, stepToPointer, thumbMinSize]);

    return (
        <ScrollAreaContext.Provider value={contextValue}>
            <div className={cn("relative min-h-0 min-w-0 overflow-hidden", className)} {...props}>
                {children}
            </div>
        </ScrollAreaContext.Provider>
    );
}
