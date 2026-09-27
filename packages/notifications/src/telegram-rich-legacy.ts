// toLegacyHtml: turns rich-message HTML into sendMessage parse_mode=HTML
// text — the fallback path when sendRichMessage itself is rejected. See
// telegram-rich.ts for the public entry point. The legacy Telegram HTML
// parser only understands a small tag set; everything else here is
// either translated into plain text or stripped, keeping only the text.

const LEGACY_SUPPORTED_TAGS = new Set([
  "b", "strong", "i", "em", "u", "ins", "s", "strike", "del",
  "a", "code", "pre", "tg-spoiler", "blockquote",
]);

function stripAllTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function convertTables(html: string): string {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, inner: string) => {
    let body = inner;
    let caption = "";
    const captionMatch = /<caption\b[^>]*>([\s\S]*?)<\/caption>/i.exec(body);
    if (captionMatch) {
      caption = `<b>${stripAllTags(captionMatch[1]).trim()}</b>\n`;
      body = body.replace(captionMatch[0], "");
    }
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, rowHtml]) => {
      const cells = [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => stripAllTags(cell[1]).trim());
      return cells.length === 2 ? `${cells[0]}: ${cells[1]}` : cells.join(" · ");
    });
    return `\n${caption}${rows.join("\n")}\n`;
  });
}

function convertHeadings(html: string): string {
  return html.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, inner: string) => `\n<b>${inner}</b>\n`);
}

function convertHr(html: string): string {
  return html.replace(/<hr\s*\/?>/gi, "\n──────────\n");
}

function convertLists(html: string): string {
  return html
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner: string) => `\n• ${inner}`)
    .replace(/<\/?[uo]l\b[^>]*>/gi, "\n");
}

function convertFooter(html: string): string {
  return html.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gi, (_, inner: string) => `\n${inner}\n`);
}

function convertParagraphs(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n");
}

// Tags the legacy parser has no equivalent for, but whose text should
// still show: drop the tag, keep the content.
function stripWrapperTags(html: string): string {
  return html.replace(/<\/?(aside|details|summary|tg-time|mark|sub|sup|caption)\b[^>]*>/gi, "");
}

// Whatever's left: keep the legacy-supported tags (with their
// attributes, e.g. <a href>), drop anything else but keep its text.
function applyWhitelist(html: string): string {
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g, (match, name: string) =>
    LEGACY_SUPPORTED_TAGS.has(name.toLowerCase()) ? match : "",
  );
}

function cleanup(html: string): string {
  return html
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toLegacyHtml(rich: string): string {
  let text = rich;
  text = convertTables(text);
  text = convertHeadings(text);
  text = convertHr(text);
  text = convertLists(text);
  text = convertFooter(text);
  text = convertParagraphs(text);
  text = stripWrapperTags(text);
  text = applyWhitelist(text);
  return cleanup(text);
}
