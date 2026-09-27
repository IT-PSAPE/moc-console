// Live preview of a rendered template: folds it into rich-message HTML
// exactly like the outgoing notification (toRichHtml), then renders that
// HTML through a fixed tag allowlist. Never dangerouslySetInnerHTML raw
// admin input — see rich-preview.ts.

import { toRichHtml } from "@moc/notifications";
import { renderRichPreviewNodes } from "./rich-preview";

export function PreviewText({ text }: { text: string }) {
    const nodes = renderRichPreviewNodes(toRichHtml(text));
    return <div className="flex flex-col gap-1.5 whitespace-pre-wrap paragraph-sm">{nodes}</div>;
}
