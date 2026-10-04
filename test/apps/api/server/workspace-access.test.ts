import { describe, expect, test } from "vitest"
import type { QueryResultRow } from "pg"
import { requireWorkspacePermission, WorkspaceAccessError, type WorkspacePermission } from "../../../../apps/api/server/workspace-access"

const userId = "550e8400-e29b-41d4-a716-446655440000"
const workspaceId = "550e8400-e29b-41d4-a716-446655440001"

function permissionQuery(role: Partial<Record<WorkspacePermission, boolean>> | undefined) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = []
  const query = async <Row extends QueryResultRow>(sql: string, values: readonly unknown[]): Promise<Row[]> => {
    calls.push({ sql, values })
    return (role ? [{
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
      can_manage_roles: false,
      ...role,
    }] : []) as Row[]
  }
  return { calls, query }
}

describe("workspace access", () => {
  test("loads the caller's persisted role for the selected workspace using bound ids", async () => {
    const { calls, query } = permissionQuery({ can_read: true })

    await requireWorkspacePermission(userId, workspaceId, "can_read", query)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.values).toEqual([workspaceId, userId])
    expect(calls[0]?.sql).toContain("m.workspace_id = $1::uuid AND m.user_id = $2::uuid")
    expect(calls[0]?.sql).toContain("JOIN public.roles r ON r.id = m.role_id")
  })

  test("requires the exact requested role permission", async () => {
    const { query } = permissionQuery({ can_read: true })

    await expect(requireWorkspacePermission(userId, workspaceId, "can_read", query)).resolves.toBeUndefined()
    await expect(requireWorkspacePermission(userId, workspaceId, "can_update", query)).rejects.toBeInstanceOf(WorkspaceAccessError)
  })

  test("allows can_write for either create or update, while leaving actual RLS checks to the operation", async () => {
    for (const role of [{ can_create: true }, { can_update: true }]) {
      const { query } = permissionQuery(role)
      await expect(requireWorkspacePermission(userId, workspaceId, "can_write", query)).resolves.toBeUndefined()
    }

    const { query } = permissionQuery({ can_create: false, can_update: false })
    await expect(requireWorkspacePermission(userId, workspaceId, "can_write", query)).rejects.toBeInstanceOf(WorkspaceAccessError)
  })

  test("denies users without a membership row", async () => {
    const { query } = permissionQuery(undefined)

    await expect(requireWorkspacePermission(userId, workspaceId, "can_read", query)).rejects.toThrow("Not a member of this workspace")
  })
})
