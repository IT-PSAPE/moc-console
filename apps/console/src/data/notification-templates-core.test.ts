// Behaviour tests for the template engine and the friendly built-in
// defaults. The defaults are intentionally NOT the old hardcoded
// wording, so these tests pin the new rendering and — more importantly
// — the structural guarantees the renderer must keep:
//   * token-free lines always render
//   * a line whose tokens ALL resolve empty is dropped
//   * blank runs collapse, leading/trailing blanks are trimmed
//   * text tokens are HTML-escaped, URL tokens are not
//
// Run: bun test apps/console/src/data/notification-templates-core.test.ts

import { test, expect } from "bun:test";
import {
  DEFAULT_TEMPLATES,
  SAMPLE_TOKENS,
  TEMPLATE_TOKENS,
  renderTemplate,
  validateTemplate,
  type MessageType,
} from "./notification-templates-core";

const ALL_TYPES = Object.keys(DEFAULT_TEMPLATES) as MessageType[];

// ---- structural invariants across every default template ----

for (const type of ALL_TYPES) {
  test(`default renders cleanly with full sample data: ${type}`, () => {
    const out = renderTemplate(DEFAULT_TEMPLATES[type], SAMPLE_TOKENS[type]);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/^\n/); // no leading blank
    expect(out).not.toMatch(/\n$/); // no trailing blank
    expect(out).not.toContain("\n\n\n"); // no double blank line
    expect(out).not.toMatch(/\{\{|\}\}/); // every placeholder substituted
    // Required fields surface; the link token is raw (unescaped).
    const url = String(SAMPLE_TOKENS[type].linkUrl ?? SAMPLE_TOKENS[type].streamUrl ?? SAMPLE_TOKENS[type].joinUrl);
    expect(out).toContain(url);
  });

  test(`every optional-only line drops when its token is empty: ${type}`, () => {
    // Blank out every token, keep only required ones non-empty so the
    // message still renders. Required = title/topic + the url token.
    const tokens: Record<string, string> = {};
    for (const t of TEMPLATE_TOKENS[type]) tokens[t.name] = "";
    if ("title" in tokens) tokens.title = "T";
    if ("topic" in tokens) tokens.topic = "Topic";
    tokens.linkUrl = "https://x/1";
    tokens.streamUrl = "https://x/1";
    tokens.joinUrl = "https://x/1";
    const out = renderTemplate(DEFAULT_TEMPLATES[type], tokens);
    expect(out).not.toContain("From "); // requesterName line gone
    expect(out).not.toContain("Status:"); // status line gone
    expect(out).not.toContain("Duty:"); // duty line gone
    expect(out).not.toContain("Hey "); // assigneeName greeting gone
    expect(out).not.toMatch(/^\n|\n$|\n\n\n/);
  });
}

// ---- explicit format lock (representative types) ----

test("request.created — all fields", () => {
  expect(renderTemplate(DEFAULT_TEMPLATES["request.created"], SAMPLE_TOKENS["request.created"])).toBe(
    [
      "✨ <b>New request just came in</b>",
      "",
      "Lower-third graphic for guest speaker",
      "🙋 From Tendai M.",
      "📌 Status: <i>not started</i>",
      "",
      '👉 <a href="https://app.example.com/requests/123">Open the request</a>',
    ].join("\n"),
  );
});

test("request.created — no requester, no status: optional lines collapse", () => {
  expect(
    renderTemplate(DEFAULT_TEMPLATES["request.created"], {
      title: "Lower-third graphic for guest speaker",
      status: null,
      requesterName: null,
      linkUrl: "https://app.example.com/requests/123",
    }),
  ).toBe(
    [
      "✨ <b>New request just came in</b>",
      "",
      "Lower-third graphic for guest speaker",
      "",
      '👉 <a href="https://app.example.com/requests/123">Open the request</a>',
    ].join("\n"),
  );
});

test("assignment.cue — all fields incl. greeting", () => {
  expect(renderTemplate(DEFAULT_TEMPLATES["assignment.cue"], SAMPLE_TOKENS["assignment.cue"])).toBe(
    [
      "👋 Hey Craig C.!",
      "🎬 <b>You've been assigned to a cue</b>",
      "",
      "Roll opening VT",
      "📋 Event: Sunday Service",
      "🛠 Duty: <i>Playback</i>",
      "",
      '👉 <a href="https://app.example.com/cue-sheet/events/77">Open the event</a>',
    ].join("\n"),
  );
});

test("assignment.cue — no assignee name, no duty: greeting + duty lines drop", () => {
  expect(
    renderTemplate(DEFAULT_TEMPLATES["assignment.cue"], {
      title: "Roll opening VT",
      eventName: "Sunday Service",
      duty: "",
      assigneeName: "",
      linkUrl: "https://app.example.com/cue-sheet/events/77",
    }),
  ).toBe(
    [
      "🎬 <b>You've been assigned to a cue</b>",
      "",
      "Roll opening VT",
      "📋 Event: Sunday Service",
      "",
      '👉 <a href="https://app.example.com/cue-sheet/events/77">Open the event</a>',
    ].join("\n"),
  );
});

// ---- behaviour ----

test("text tokens are HTML-escaped, URL tokens are not", () => {
  const out = renderTemplate(DEFAULT_TEMPLATES["request.created"], {
    title: "A & B <c>",
    status: "x>y",
    requesterName: "M&Co",
    linkUrl: "https://x?a=1&b=2",
  });
  expect(out).toContain("A &amp; B &lt;c&gt;");
  expect(out).toContain("M&amp;Co");
  expect(out).toContain('href="https://x?a=1&b=2"'); // URL untouched
});

test("a line whose tokens all resolve empty is dropped", () => {
  expect(renderTemplate("Header\nFrom: {{requesterName}}\nEnd", { requesterName: "" })).toBe(
    "Header\nEnd",
  );
});

test("token-free lines are always kept; blank runs collapse", () => {
  expect(renderTemplate("A\n\n\n{{x}}\n\nB", { x: "" })).toBe("A\n\nB");
});

test("validateTemplate flags unknown tokens for the type", () => {
  expect(validateTemplate("request.created", "{{title}} {{linkUrl}}")).toEqual([]);
  expect(
    validateTemplate("request.created", "{{title}} {{bogus}} {{joinUrl}}").sort(),
  ).toEqual(["bogus", "joinUrl"]);
});
