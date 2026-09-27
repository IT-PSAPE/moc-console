// Pure, dependency-free template engine for Telegram notifications.
// Imported by BOTH the server (dispatch.ts) and the settings UI (live
// preview), so it must stay free of Node and React.
//
// A template is plain text with {{token}} placeholders plus literal rich
// Telegram HTML (see telegram-rich.ts for the tags themselves). Only
// token *values* are HTML-escaped (URL tokens excepted — see
// RAW_TOKEN_NAMES); the literal text passes through untouched. A line
// whose tokens ALL resolve empty is dropped, so optional fields collapse
// cleanly (see toRichHtml, which then folds the surviving lines into
// real rich-message HTML).

import { escapeHtml, RAW_TOKEN_NAMES, TEMPLATE_TOKENS, type MessageType } from "./template-tokens.js";

export type TokenValues = Record<string, string | null | undefined>;

const TOKEN_RE = /\{\{(\w+)\}\}/g;

function isEmpty(value: string | null | undefined): boolean {
  return value == null || value === "";
}

function resolveToken(name: string, value: string | null | undefined): string {
  if (isEmpty(value)) return "";
  return RAW_TOKEN_NAMES.has(name) ? (value as string) : escapeHtml(value as string);
}

/**
 * Render a template against resolved token values.
 *
 * - {{token}} → escaped value (raw for URL tokens); unknown/empty → "".
 * - Literal text (incl. rich HTML tags) passes through untouched.
 * - A line whose tokens ALL resolve empty is dropped entirely.
 * - Runs of blank lines collapse to one; leading/trailing blanks trimmed.
 */
export function renderTemplate(body: string, values: TokenValues): string {
  const kept: string[] = [];

  for (const line of body.split("\n")) {
    const tokens = [...line.matchAll(TOKEN_RE)];
    if (tokens.length > 0 && tokens.every((m) => isEmpty(values[m[1]]))) {
      continue; // every token on this line is empty → drop the line
    }
    kept.push(line.replace(TOKEN_RE, (_, name: string) => resolveToken(name, values[name])));
  }

  // Collapse consecutive blanks and trim leading/trailing blank lines.
  const out: string[] = [];
  for (const line of kept) {
    const blank = line.trim() === "";
    if (blank && (out.length === 0 || out[out.length - 1].trim() === "")) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();

  return out.join("\n");
}

/** Token names referenced by a template that are not valid for `type`. */
export function validateTemplate(type: MessageType, body: string): string[] {
  const valid = new Set(TEMPLATE_TOKENS[type].map((t) => t.name));
  const unknown = new Set<string>();
  for (const m of body.matchAll(TOKEN_RE)) {
    if (!valid.has(m[1])) unknown.add(m[1]);
  }
  return [...unknown];
}
