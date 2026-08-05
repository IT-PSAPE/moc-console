import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { assignmentEventKey } from "./assignment.js"

describe("assignmentEventKey", () => {
  it("deduplicates retries of one assignment but not a later re-assignment", () => {
    const originalAssignmentId = "99447b5b-3f84-4ad8-a310-c257637a4a97"
    const replacementAssignmentId = "9e0a9dd6-cb87-48e0-91fa-90a0bb2e6f39"

    assert.equal(assignmentEventKey(originalAssignmentId), assignmentEventKey(originalAssignmentId))
    assert.notEqual(assignmentEventKey(originalAssignmentId), assignmentEventKey(replacementAssignmentId))
  })
})
