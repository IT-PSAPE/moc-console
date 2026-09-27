// toRichHtml: turns a rendered template (legacy line-based Telegram HTML,
// where "\n" means a line break) into valid rich-message HTML for
// sendRichMessage's `html` mode, where raw newlines are NOT reliable line
// breaks. See telegram-rich.ts for the public entry point.

// Block-level rich tags (Bot API 10.3). A line starting with one of these
// is passed through untouched instead of being folded into a <p>.
const BLOCK_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "hr", "footer",
  "table", "tr", "th", "td", "caption",
  "blockquote", "aside",
  "ul", "ol", "li",
  "details", "summary", "pre",
] as const;

// hr is the only void element in the list — it never needs a closing tag.
const VOID_BLOCK_TAGS = new Set(["hr"]);

// Blocks whose content is running text. A multi-line value inside one (e.g. a
// notes token in a <blockquote>) is joined with <br> so its line breaks
// survive; structural blocks (tables, lists, details) keep their raw lines.
const TEXT_BLOCK_TAGS = new Set(["p", "footer", "blockquote", "aside", "h1", "h2", "h3", "h4", "h5", "h6", "caption", "summary", "th", "td", "li"]);

const BLOCK_START_RE = new RegExp(
  `^<\\/?(${BLOCK_TAGS.join("|")})(?=[\\s/>]|$)`,
  "i",
);

function matchBlockTag(line: string): string | null {
  const match = BLOCK_START_RE.exec(line.trimStart());
  return match ? match[1].toLowerCase() : null;
}

function netTagDepth(tag: string, line: string): number {
  const opens = (line.match(new RegExp(`<${tag}(?=[\\s/>])`, "gi")) ?? []).length;
  const closes = (line.match(new RegExp(`</${tag}>`, "gi")) ?? []).length;
  return opens - closes;
}

/**
 * Rendered template text → rich-message HTML.
 *
 * - Consecutive non-empty plain lines fold into one <p>, joined by <br>.
 * - A blank line starts a new <p>.
 * - A line starting with a block-level tag passes through as-is; if it
 *   opens the tag without closing it on the same line, every following
 *   line (blank or not) is also passed through raw until the matching
 *   close is found, so a multi-line <table> or <blockquote> stays intact.
 *   Inside running-text blocks those continuation lines join with <br>.
 */
export function toRichHtml(rendered: string): string {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let openTag: { name: string; depth: number } | null = null;

  function flushParagraph() {
    if (paragraph.length > 0) blocks.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  }

  for (const line of rendered.split("\n")) {
    if (openTag) {
      if (TEXT_BLOCK_TAGS.has(openTag.name)) {
        blocks[blocks.length - 1] += `<br>${line}`;
      } else {
        blocks.push(line);
      }
      openTag.depth += netTagDepth(openTag.name, line);
      if (openTag.depth <= 0) openTag = null;
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    const tag = matchBlockTag(line);
    if (tag) {
      flushParagraph();
      blocks.push(line);
      if (!VOID_BLOCK_TAGS.has(tag)) {
        const depth = netTagDepth(tag, line);
        if (depth > 0) openTag = { name: tag, depth };
      }
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();

  return blocks.join("\n");
}
