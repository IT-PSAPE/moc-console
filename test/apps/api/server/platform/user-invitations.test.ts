import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({ withActor: vi.fn(), sendAuthEmail: vi.fn(), events: [] as string[], queries: [] as Array<{ text: string; values: readonly unknown[] }> }))
vi.mock("@moc/backend/database", () => ({ withActor: mocks.withActor }))
vi.mock("@moc/backend/auth/email", () => ({ sendAuthEmail: mocks.sendAuthEmail }))

import type { PlatformContext } from "../../../../../apps/api/server/platform/context.js"
import { invitationOperations } from "../../../../../apps/api/server/platform/user-invitations.js"

const invitation = { id: "00000000-0000-4000-8000-000000000003", email: "member@example.test", created_at: "2026-10-24T00:00:00.000Z", expires_at: "2026-10-31T00:00:00.000Z" }

function createContext() {
  const context = {
    workspaceId: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    db: { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) },
  } as unknown as PlatformContext
  return context
}

describe("workspace invitation operations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.events.length = 0
    mocks.queries.length = 0
    process.env.MOC_CONSOLE_ORIGIN = "https://console.example.test"
    mocks.sendAuthEmail.mockImplementation(async () => { mocks.events.push("email") })
    mocks.withActor.mockImplementation(async (_actor, work) => {
      const client = {
        query: async (text: string, values: readonly unknown[] = []) => {
          mocks.queries.push({ text, values })
          if (text.includes("SELECT r.can_manage_roles")) return { rows: [{ can_manage_roles: true }], rowCount: 1 }
          if (text.includes("SELECT EXISTS")) return { rows: [{ exists: false }], rowCount: 1 }
          if (text.includes("INSERT INTO public.workspace_invitations")) return { rows: [invitation], rowCount: 1 }
          if (text.includes("UPDATE public.workspace_invitations") && text.includes("RETURNING")) return { rows: [invitation], rowCount: 1 }
          return { rows: [], rowCount: 1 }
        },
      }
      const result = await work(client as never)
      mocks.events.push("commit")
      return result
    })
  })

  test("persists a workspace-scoped invitation before attempting delivery", async () => {
    const result = await invitationOperations.invite.run(createContext(), { email: " Member@Example.Test " }) as { invitation: { email: string }; emailSent: boolean }

    expect(result).toEqual({ invitation: { id: invitation.id, email: invitation.email, createdAt: invitation.created_at, expiresAt: invitation.expires_at }, emailSent: true })
    expect(mocks.events).toEqual(["commit", "email"])
    expect(mocks.queries.at(-1)?.values).toEqual(["00000000-0000-4000-8000-000000000001", "Member@Example.Test"])
    expect(mocks.queries.at(-1)?.text).toContain("ON CONFLICT (workspace_id, normalized_email)")
  })

  test("keeps the invitation when delivery fails and reports the failure", async () => {
    mocks.sendAuthEmail.mockRejectedValueOnce(new Error("SMTP unavailable"))

    const result = await invitationOperations.invite.run(createContext(), { email: "member@example.test" }) as { emailSent: boolean }

    expect(result.emailSent).toBe(false)
    expect(mocks.events).toEqual(["commit"])
  })

  test("checks manager authority inside the transaction and rejects unscoped input", async () => {
    mocks.withActor.mockImplementationOnce(async (_actor, work) => {
      const client = { query: async (text: string) => text.includes("SELECT r.can_manage_roles") ? { rows: [{ can_manage_roles: false }], rowCount: 1 } : { rows: [], rowCount: 0 } }
      return work(client as never)
    })

    await expect(invitationOperations.invite.run(createContext(), { email: "member@example.test" })).rejects.toMatchObject({ status: 403, code: "forbidden" })
    expect(mocks.sendAuthEmail).not.toHaveBeenCalled()
    await expect(invitationOperations.invite.run(createContext(), { email: "member@example.test", workspaceId: "forged" })).rejects.toThrow("Unexpected input field")
  })

  test("does not create an invitation for an existing workspace member", async () => {
    mocks.withActor.mockImplementationOnce(async (_actor, work) => {
      const client = {
        query: async (text: string) => text.includes("SELECT r.can_manage_roles")
          ? { rows: [{ can_manage_roles: true }], rowCount: 1 }
          : { rows: [{ exists: true }], rowCount: 1 },
      }
      return work(client as never)
    })

    await expect(invitationOperations.invite.run(createContext(), { email: "member@example.test" })).rejects.toMatchObject({ status: 409, code: "already_a_member" })
    expect(mocks.sendAuthEmail).not.toHaveBeenCalled()
  })

  test("scopes list and revoke operations to the active workspace", async () => {
    const context = createContext()
    await invitationOperations.invitations.run(context, null)
    expect(context.db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE workspace_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL"), [context.workspaceId])

    await invitationOperations.revokeInvitation.run(context, { invitationId: invitation.id })
    expect(mocks.queries.at(-1)?.values).toEqual([invitation.id, context.workspaceId])
    expect(mocks.queries.at(-1)?.text).toContain("WHERE id = $1::uuid AND workspace_id = $2")
  })
})
