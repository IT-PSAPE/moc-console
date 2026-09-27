// Safely turns rich-message HTML (the output of @moc/notifications'
// toRichHtml) into React nodes for the settings live-preview. Never uses
// dangerouslySetInnerHTML: every tag is matched against a fixed allowlist
// and rendered as a real React element; anything else (an unknown tag, a
// stray close) is dropped while its text content is kept, exactly like
// the legacy-HTML fallback treats unsupported tags.

import { createElement, type ReactNode } from "react";

const VOID_TAGS = new Set(["br", "hr"]);

// Tag → the element (and class names) it renders as. Kept intentionally
// plain — this is a text preview, not a UI surface, so no base
// components (Card, Badge, …) apply here.
const TAG_ELEMENT: Record<string, { el: string; className?: string }> = {
    h1: { el: "div", className: "text-lg font-semibold" },
    h2: { el: "div", className: "text-lg font-semibold" },
    h3: { el: "div", className: "text-base font-semibold" },
    h4: { el: "div", className: "text-base font-semibold" },
    h5: { el: "div", className: "font-semibold" },
    h6: { el: "div", className: "font-semibold" },
    p: { el: "p" },
    footer: { el: "div", className: "mt-1 text-xs text-quaternary" },
    blockquote: { el: "div", className: "border-l-2 border-border-secondary pl-2 text-secondary" },
    aside: { el: "div", className: "border-l-2 border-border-secondary pl-2 italic text-secondary" },
    ul: { el: "ul", className: "list-disc pl-4" },
    ol: { el: "ol", className: "list-decimal pl-4" },
    li: { el: "li" },
    details: { el: "details" },
    summary: { el: "summary", className: "font-medium" },
    table: { el: "table", className: "border-collapse text-sm" },
    tr: { el: "tr" },
    th: { el: "th", className: "border border-border-secondary px-1.5 py-0.5 text-left font-semibold" },
    td: { el: "td", className: "border border-border-secondary px-1.5 py-0.5" },
    caption: { el: "caption", className: "text-left font-semibold" },
    a: { el: "a", className: "text-brand underline" },
    b: { el: "b" },
    strong: { el: "strong" },
    i: { el: "i" },
    em: { el: "em" },
    u: { el: "u" },
    ins: { el: "ins" },
    s: { el: "s" },
    strike: { el: "s" },
    del: { el: "del" },
    code: { el: "code", className: "rounded bg-secondary px-1 font-mono" },
    pre: { el: "pre", className: "overflow-x-auto rounded bg-secondary p-2 font-mono" },
    "tg-spoiler": { el: "span", className: "rounded bg-quaternary text-transparent" },
    mark: { el: "mark" },
    sub: { el: "sub" },
    sup: { el: "sup" },
    "tg-time": { el: "span", className: "italic text-quaternary" },
};

const TAG_RE = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/;

const SAFE_HREF_RE = /^(https?:|tg:|mailto:|tel:|#)/i;

// Only link schemes Telegram itself renders; anything else (javascript:,
// data:, …) is dropped so a template can't smuggle script into the console.
function hrefOf(attrs: string): string | undefined {
    const href = /href="([^"]*)"/i.exec(attrs)?.[1];
    return href && SAFE_HREF_RE.test(href.trim()) ? decodeEntities(href) : undefined;
}

// The named entities Telegram's rich HTML accepts, plus numeric ones. React
// escapes text itself, so decoding here only affects what the reader sees.
const NAMED_ENTITIES: Record<string, string> = {
    lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: "\u00a0", hellip: "…",
    mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, body: string) => {
        if (body[0] === "#") {
            const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
        }
        return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
    });
}

// Finds this tag's first closing match (not nesting-aware — fine for a
// preview, where templates don't nest the same tag inside itself).
function extractInner(name: string, text: string): { inner: string; rest: string } {
    const close = new RegExp(`</${name}>`, "i").exec(text);
    if (!close) return { inner: text, rest: "" };
    return { inner: text.slice(0, close.index), rest: text.slice(close.index + close[0].length) };
}

export function renderRichPreviewNodes(html: string): ReactNode[] {
    let key = 0;

    function parse(text: string): ReactNode[] {
        const nodes: ReactNode[] = [];
        let rest = text;
        while (rest.length > 0) {
            const match = TAG_RE.exec(rest);
            if (!match) {
                nodes.push(decodeEntities(rest));
                break;
            }
            const [full, closingSlash, rawName, attrs] = match;
            if (match.index > 0) nodes.push(decodeEntities(rest.slice(0, match.index)));
            const name = rawName.toLowerCase();
            const after = rest.slice(match.index + full.length);

            if (!closingSlash && VOID_TAGS.has(name)) {
                nodes.push(name === "br"
                    ? createElement("br", { key: key++ })
                    : createElement("hr", { key: key++, className: "my-1 border-border-secondary" }));
                rest = after;
                continue;
            }
            if (closingSlash || /\/\s*$/.test(attrs) || !TAG_ELEMENT[name]) {
                rest = after; // stray close, self-closed or unknown tag dropped; its text stays in the stream
                continue;
            }

            const { inner, rest: restAfter } = extractInner(name, after);
            const spec = TAG_ELEMENT[name];
            const props: Record<string, unknown> = { key: key++, className: spec.className };
            if (name === "a") {
                props.href = hrefOf(attrs);
                props.target = "_blank";
                props.rel = "noreferrer";
            }
            nodes.push(createElement(spec.el, props, ...parse(inner)));
            rest = restAfter;
        }
        return nodes;
    }

    return parse(html);
}
