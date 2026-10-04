import assert from "node:assert/strict"
import { describe, it } from "vitest"
import { requireWorkspaceCreateOrEntityOwnership } from "../../../../../apps/api/server/notifications/authorization.js"
import { WorkspaceAccessError } from "../../../../../apps/api/server/workspace-access.js"

describe("notification creation permissions", () => {
  it("requires current membership even when the caller created the entity", async () => {
    await assert.rejects(
      requireWorkspaceCreateOrEntityOwnership("user-1", "workspace-1", "user-1", async () => null),
      WorkspaceAccessError,
    )
  })

  it("allows an entity creator who is still a workspace member", async () => {
    await assert.doesNotReject(
      requireWorkspaceCreateOrEntityOwnership("user-1", "workspace-1", "user-1", async () => ({ can_create: false })),
    )
  })

  it("allows another member only when their workspace role can create", async () => {
    await assert.rejects(
      requireWorkspaceCreateOrEntityOwnership("user-2", "workspace-1", "user-1", async () => ({ can_create: false })),
      (error: unknown) => error instanceof WorkspaceAccessError && error.message === "Insufficient workspace permission",
    )
    await assert.doesNotReject(
      requireWorkspaceCreateOrEntityOwnership("user-2", "workspace-1", "user-1", async () => ({ can_create: true })),
    )
  })
})
