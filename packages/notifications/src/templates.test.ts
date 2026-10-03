import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ANNOUNCEMENT_EVENT_KEYS } from "./event-routing.js"
import { DEFAULT_TEMPLATES } from "./default-templates.js"
import { renderTemplate, validateTemplate } from "./render-template.js"
import { SAMPLE_TOKENS } from "./sample-tokens.js"
import { DM_MESSAGE_TYPES, TEMPLATE_TOKENS, type MessageType } from "./template-tokens.js"
import { toRichHtml } from "./telegram-rich.js"

const ALL_MESSAGE_TYPES: readonly MessageType[] = [...ANNOUNCEMENT_EVENT_KEYS, ...DM_MESSAGE_TYPES]

describe("DEFAULT_TEMPLATES", () => {
  it("covers exactly the five announcements plus the two DMs", () => {
    assert.deepEqual(Object.keys(DEFAULT_TEMPLATES).sort(), [...ALL_MESSAGE_TYPES].sort())
  })

  it("renders and converts to rich HTML with no stray tokens", () => {
    for (const type of ALL_MESSAGE_TYPES) {
      const rendered = renderTemplate(DEFAULT_TEMPLATES[type], SAMPLE_TOKENS[type])
      assert.equal(rendered.includes("{{"), false, `${type} left an unresolved token`)
      const rich = toRichHtml(rendered)
      assert.equal(rich.includes("{{"), false)
      assert.ok(rich.length > 0)
    }
  })

  it("gives every announcement a distinct <h3> heading with its own emoji", () => {
    const headings = ANNOUNCEMENT_EVENT_KEYS.map((key) => /<h3>(.*?)<\/h3>/.exec(DEFAULT_TEMPLATES[key])?.[1])
    assert.deepEqual(headings, ["📥 New request", "🎒 Equipment booking", "🏛️ Venue booking", "🔴 Live stream", "🎥 Zoom meeting"])
  })

  it("drops the old 'Open the …' link line for the three entity announcements", () => {
    for (const key of ["request.created", "booking.created", "venue_booking.created"] as const) {
      assert.equal(DEFAULT_TEMPLATES[key].includes("linkUrl"), false)
    }
  })

  it("keeps the streamUrl/joinUrl links since stream and meeting get no keyboard", () => {
    assert.ok(DEFAULT_TEMPLATES["stream.created"].includes("{{streamUrl}}"))
    assert.ok(DEFAULT_TEMPLATES["meeting.created"].includes("{{joinUrl}}"))
  })

  it("puts notes in a blockquote and the tracking code in a native paragraph", () => {
    assert.ok(DEFAULT_TEMPLATES["request.created"].includes("<blockquote>{{notes}}</blockquote>"))
    assert.ok(DEFAULT_TEMPLATES["request.created"].includes("<p>{{trackingCode}}</p>"))
  })

  it("drops the checklist DM's link line but keeps linkUrl as a valid token", () => {
    assert.equal(DEFAULT_TEMPLATES["assignment.checklist_item"].includes("linkUrl"), false)
    assert.ok(TEMPLATE_TOKENS["assignment.checklist_item"].some((t) => t.name === "linkUrl"))
  })

  it("drops a line whose only token is empty (one fact per line)", () => {
    const rendered = renderTemplate(DEFAULT_TEMPLATES["request.created"], { ...SAMPLE_TOKENS["request.created"], notes: "" })
    assert.equal(rendered.includes("<blockquote>"), false)
  })
})

describe("validateTemplate", () => {
  it("accepts the default body for every templatable type", () => {
    for (const type of ALL_MESSAGE_TYPES) assert.deepEqual(validateTemplate(type, DEFAULT_TEMPLATES[type]), [])
  })

  it("flags a token that isn't valid for the type", () => {
    assert.deepEqual(validateTemplate("request.created", "{{notARealToken}}"), ["notARealToken"])
  })
})
