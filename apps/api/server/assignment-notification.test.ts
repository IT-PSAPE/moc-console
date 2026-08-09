import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { assignmentEventKey } from "../api/notifications/assignment.js"
import {
  DEFAULT_TEMPLATES,
  DM_MESSAGE_TYPES,
  scopeForMessageType,
  TEMPLATE_TOKENS,
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
      assert.ok(TEMPLATE_TOKENS[messageType].some((token) => token.name === "duty"))
      assert.ok(TEMPLATE_TOKENS[messageType].some((token) => token.name === "linkUrl"))
    }
  })
})
