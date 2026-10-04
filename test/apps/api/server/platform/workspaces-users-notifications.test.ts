import { describe, expect, test } from "vitest"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations as workspaceOperations } from "../../../../../apps/api/server/platform/workspaces"
import { operations as userOperations } from "../../../../../apps/api/server/platform/users"
import { operations as notificationOperations } from "../../../../../apps/api/server/platform/notification-settings"

type QueryCall = { text: string; values: readonly unknown[] }

function createContext(query: (text: string, values: readonly unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>) {
  const calls: QueryCall[] = []
  const context = {
    workspaceId: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    db: { query: async (text: string, values: readonly unknown[] = []) => { calls.push({ text, values }); return query(text, values) } },
  } as unknown as PlatformContext
  return { context, calls }
}

describe("workspace, user and notification platform operations", () => {
  test("workspace directory derives the actor from verified context", async () => {
    const { context, calls } = createContext(async () => ({ rows: [], rowCount: 0 }))
    await workspaceOperations.directory.run(context, null)
    expect(calls[0].text).toContain("WHERE m.user_id = $1")
    expect(calls[0].values).toEqual([context.userId])
  })

  test("workspace updates target the verified workspace and reject caller-selected IDs", async () => {
    const { context, calls } = createContext(async () => ({ rows: [{ id: context.workspaceId, name: "New", slug: "new", description: null }], rowCount: 1 }))
    const result = await workspaceOperations.update.run(context, { name: "New" })
    expect(result).toEqual({ id: context.workspaceId, name: "New", slug: "new", description: null })
    expect(calls[0].values[0]).toBe(context.workspaceId)
    await expect(workspaceOperations.update.run(context, { id: "other-workspace", name: "Escalated" })).rejects.toThrow("Unexpected input field")
  })

  test("profile reads and writes are pinned to the authenticated actor", async () => {
    const { context, calls } = createContext(async () => ({ rows: [], rowCount: 1 }))
    await userOperations.getProfile.run(context, null)
    await userOperations.updateProfile.run(context, { name: "Updated" })
    expect(calls[0].values).toEqual([context.userId])
    expect(calls[1].text).toContain("WHERE id = $1")
    expect(calls[1].values[0]).toBe(context.userId)
    await expect(userOperations.updateProfile.run(context, { userId: "forged", name: "Updated" })).rejects.toThrow("Unexpected input field")
  })

  test("lists workspace users without PostgreSQL-invalid DISTINCT ordering", async () => {
    const { context, calls } = createContext(async () => ({ rows: [], rowCount: 0 }))
    await userOperations.all.run(context, null)

    expect(calls[0].text).not.toContain("SELECT DISTINCT")
    expect(calls[0].text).toContain("WHERE m.workspace_id = $1")
    expect(calls[0].text).toContain("ORDER BY lower(u.name), lower(u.surname), u.email")
    expect(calls[0].values).toEqual([context.workspaceId])
  })

  test("role and membership mutation functions receive the active workspace", async () => {
    const { context, calls } = createContext(async () => ({ rows: [], rowCount: 1 }))
    await userOperations.assignRole.run(context, { userId: "00000000-0000-4000-8000-000000000003", roleId: "00000000-0000-4000-8000-000000000004" })
    await userOperations.assignMemberType.run(context, { userId: "00000000-0000-4000-8000-000000000003", typeId: "00000000-0000-4000-8000-000000000004" })
    expect(calls[0].text).toContain("public.set_workspace_member_role($1, $2, $3)")
    expect(calls[0].values[0]).toBe(context.workspaceId)
    expect(calls[1].text).toContain("public.set_workspace_member_type($1, $2, $3)")
    expect(calls[1].values[0]).toBe(context.workspaceId)
  })

  test("join approval locks and removes only a request in the verified workspace", async () => {
    const { context, calls } = createContext(async (text) => {
      if (text.includes("SELECT user_id")) return { rows: [{ user_id: "00000000-0000-4000-8000-000000000003" }], rowCount: 1 }
      return { rows: [], rowCount: 1 }
    })
    await userOperations.approveJoinRequest.run(context, { requestId: "00000000-0000-4000-8000-000000000005" })
    expect(calls[0].text).toContain("id = $1 AND workspace_id = $2")
    expect(calls[0].values[1]).toBe(context.workspaceId)
    expect(calls[1].text).toContain("public.approve_workspace_join_request($1)")
    expect(calls[1].values).toEqual(["00000000-0000-4000-8000-000000000005"])
  })

  test("join rejection uses the security-definer operation and scopes its lookup", async () => {
    const { context, calls } = createContext(async (text) =>
      text.includes("SELECT user_id") ? { rows: [{ user_id: "00000000-0000-4000-8000-000000000003" }], rowCount: 1 } : { rows: [], rowCount: 1 },
    )

    await userOperations.rejectJoinRequest.run(context, { requestId: "00000000-0000-4000-8000-000000000005" })

    expect(calls[0].text).toContain("id = $1 AND workspace_id = $2")
    expect(calls[0].values[1]).toBe(context.workspaceId)
    expect(calls[1].text).toContain("public.reject_workspace_join_request($1)")
    expect(calls[1].values).toEqual(["00000000-0000-4000-8000-000000000005"])
  })

  test("notification mutations scope settings and route writes to verified workspace", async () => {
    const { context, calls } = createContext(async () => ({ rows: [], rowCount: 1 }))
    await notificationOperations.updateAutoArchiveDays.run(context, { completedRequestsDays: 5, returnedBookingsDays: 6 })
    await notificationOperations.deleteRoute.run(context, { id: "00000000-0000-4000-8000-000000000003" })
    expect(calls[0].values).toEqual([context.workspaceId, 5, 6])
    expect(calls[1].text).toContain("WHERE workspace_id = $1 AND id = $2")
    expect(calls[1].values[0]).toBe(context.workspaceId)
    await expect(notificationOperations.deleteRoute.run(context, { id: "00000000-0000-4000-8000-000000000003", workspaceId: "forged" })).rejects.toThrow("Unexpected input field")
  })
})
