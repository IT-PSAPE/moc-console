import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { assignmentEventKey } from "../api/notifications/assignment.js"
import {
  DEFAULT_TEMPLATES,
  DM_MESSAGE_TYPES,
  SAMPLE_TOKENS,
  renderTemplate,
  scopeForMessageType,
  TEMPLATE_TOKENS,
  validateTemplate,
} from "@moc/notifications"

describe("assignmentEventKey", () => {
  it("deduplicates retries of one assignment but not a later re-assignment", () => {
    const originalAssignmentId = "99447b5b-3f84-4ad8-a310-c257637a4a97"
    const replacementAssignmentId = "9e0a9dd6-cb87-48e0-91fa-90a0bb2e6f39"

    assert.equal(assignmentEventKey("request", originalAssignmentId), assignmentEventKey("request", originalAssignmentId))
    assert.notEqual(assignmentEventKey("request", originalAssignmentId), assignmentEventKey("request", replacementAssignmentId))
    assert.notEqual(assignmentEventKey("request", originalAssignmentId), assignmentEventKey("checklist_item", originalAssignmentId))
  })

  it("configures request and checklist-item assignments as editable direct messages", () => {
    for (const messageType of ["assignment.request", "assignment.checklist_item"] as const) {
      assert.equal(DM_MESSAGE_TYPES.includes(messageType), true)
      assert.equal(scopeForMessageType(messageType), "dm")
      assert.ok(DEFAULT_TEMPLATES[messageType].length > 0)
      assert.ok(TEMPLATE_TOKENS[messageType].some((token) => token.name === "assigneeName"))
      assert.ok(TEMPLATE_TOKENS[messageType].some((token) => token.name === "linkUrl"))
    }
  })

  it("keeps duty on request assignments and drops it from checklist-item assignments", () => {
    assert.ok(TEMPLATE_TOKENS["assignment.request"].some((token) => token.name === "duty"))
    assert.equal(TEMPLATE_TOKENS["assignment.checklist_item"].some((token) => token.name === "duty"), false)
    assert.equal(DEFAULT_TEMPLATES["assignment.checklist_item"].includes("{{duty}}"), false)
  })

  it("renders a checklist-item assignment with no duty line and no stray tokens", () => {
    const text = renderTemplate(
      DEFAULT_TEMPLATES["assignment.checklist_item"],
      SAMPLE_TOKENS["assignment.checklist_item"],
    )
    assert.equal(text.includes("Duty"), false)
    assert.equal(text.includes("{{"), false)
  })

  // Justifies the template scrub in migration 20260818120000: rendering degrades
  // gracefully, but the settings editor rejects the stored token.
  it("drops a stale duty line from a customised checklist-item template", () => {
    const stored = "Hi {{assigneeName}}\n🛠 <b>Duty:</b> <i>{{duty}}</i>\n{{title}}"
    assert.equal(
      renderTemplate(stored, SAMPLE_TOKENS["assignment.checklist_item"]),
      "Hi Craig C.\nCheck radio mic batteries",
    )
    assert.deepEqual(validateTemplate("assignment.checklist_item", stored), ["duty"])
  })
})
