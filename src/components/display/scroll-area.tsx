import { ScrollAreaContent } from "./scroll-area/scroll-area-content";
import { ScrollAreaCorner } from "./scroll-area/scroll-area-corner";
import { ScrollAreaRoot } from "./scroll-area/scroll-area-root";
import { ScrollAreaScrollbar } from "./scroll-area/scroll-area-scrollbar";
import { ScrollAreaThumb } from "./scroll-area/scroll-area-thumb";
import { ScrollAreaViewport } from "./scroll-area/scroll-area-viewport";

export const ScrollArea = Object.assign(ScrollAreaRoot, {
    Content: ScrollAreaContent,
    Corner: ScrollAreaCorner,
    Scrollbar: ScrollAreaScrollbar,
    Thumb: ScrollAreaThumb,
    Viewport: ScrollAreaViewport,
});
