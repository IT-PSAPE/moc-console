// Behaviour + integrity tests for the template engine and the
// composable token catalog. Exact default wording is intentionally NOT
// pinned (admins/devs iterate on it); instead we lock the structural
// guarantees that must always hold:
//   * every token a default template references is valid for its type
//   * token-free lines always render; all-empty-token lines drop
//   * blank runs collapse, leading/trailing blanks trimmed
//   * text tokens are HTML-escaped, URL tokens are not
//   * the category catalogs stay internally consistent
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

// ---- catalog integrity ----

for (const type of ALL_TYPES) {
  test(`catalog has no duplicate token names: ${type}`, () => {
    const names = TEMPLATE_TOKENS[type].map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test(`default template only references valid tokens: ${type}`, () => {
    expect(validateTemplate(type, DEFAULT_TEMPLATES[type])).toEqual([]);
  });

  test(`every catalog token has a sample value: ${type}`, () => {
    for (const t of TEMPLATE_TOKENS[type]) {
      expect(SAMPLE_TOKENS[type]).toHaveProperty(t.name);
    }
  });
}

// ---- default rendering invariants ----

for (const type of ALL_TYPES) {
  test(`default renders cleanly with full sample data: ${type}`, () => {
    const out = renderTemplate(DEFAULT_TEMPLATES[type], SAMPLE_TOKENS[type]);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/^\n/); // no leading blank
    expect(out).not.toMatch(/\n$/); // no trailing blank
    expect(out).not.toContain("\n\n\n"); // no double blank line
    expect(out).not.toMatch(/\{\{|\}\}/); // every placeholder substituted
    const s = SAMPLE_TOKENS[type];
    const url = String(s.linkUrl ?? s.streamUrl ?? s.joinUrl);
    expect(out).toContain(url); // the action link survives
  });

  test(`optional-only lines drop when their token is empty: ${type}`, () => {
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
    expect(out).not.toContain("Hey "); // assignee greeting gone
    expect(out).not.toMatch(/^\n|\n$|\n\n\n/);
  });
}

// ---- behaviour ----

test("text tokens are HTML-escaped, URL tokens are not", () => {
  const out = renderTemplate(
    "{{title}}\n{{requesterName}}\n<a href=\"{{linkUrl}}\">x</a>",
    {
      title: "A & B <c>",
      requesterName: "M&Co",
      linkUrl: "https://x?a=1&b=2",
    },
  );
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
  expect(validateTemplate("request.created", "{{title}} {{linkUrl}} {{priority}} {{dueDate}}")).toEqual([]);
  expect(
    validateTemplate("request.created", "{{title}} {{bogus}} {{joinUrl}}").sort(),
  ).toEqual(["bogus", "joinUrl"]);
});

test("request category exposes the rich composable fields", () => {
  const names = new Set(TEMPLATE_TOKENS["request.created"].map((t) => t.name));
  for (const f of ["priority", "category", "dueDate", "requestedBy", "trackingCode", "who", "what"]) {
    expect(names.has(f)).toBe(true);
  }
  // request assignment shares the request category + DM-only fields
  const asg = new Set(TEMPLATE_TOKENS["assignment.request"].map((t) => t.name));
  expect(asg.has("priority")).toBe(true);
  expect(asg.has("duty")).toBe(true);
  expect(asg.has("assigneeName")).toBe(true);
});
