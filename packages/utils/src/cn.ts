import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the named spacing tokens from packages/ui/src/index.css so
// `h-control` / `size-control-sm` / `pt-page-top` etc. are recognised as members of
// the height/width/padding groups and correctly override (or get overridden by)
// numeric utilities such as `h-9`. Without this, both classes survive the merge
// and the winner depends on stylesheet order.
const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            spacing: [
                "control",
                "control-sm",
                "control-lg",
                "header",
                "sidebar",
                "sidebar-collapsed",
                "content",
                "content-sm",
                "content-md",
                "page-gutter",
                "page-top",
            ],
        },
    },
});

export function cn(...classes: Array<string | false | null | undefined>) {
    return twMerge(classes)
}
