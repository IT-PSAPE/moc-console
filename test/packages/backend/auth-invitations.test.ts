import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({ withActor: vi.fn(), queries: [] as Array<{ text: string; values: readonly unknown[] }> }))
vi.mock("../../../packages/backend/src/database.js", () => ({ withActor: mocks.withActor }))

import { acceptInvitations, canSignInWithEmail, hasWorkspaceMembership, normalizeInvitationEmail } from "../../../packages/backend/src/auth/invitations.js"

const workspaceA = "00000000-0000-4000-8000-000000000010"
const workspaceB = "00000000-0000-4000-8000-000000000011"
const userId = "00000000-0000-4000-8000-000000000001"

describe("auth invitation admission repository", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queries.length = 0
    mocks.withActor.mockImplementation(async (_actor, work) => {
      const client = {
        query: async (text: string, values: readonly unknown[] = []) => {
          mocks.queries.push({ text, values })
          if (text.includes("SELECT workspace_id, id FROM public.workspace_invitations")) return { rows: [{ workspace_id: workspaceA, id: "invite-a" }, { workspace_id: workspaceB, id: "invite-b" }], rowCount: 2 }
          if (text.includes("SELECT EXISTS")) return { rows: [{ exists: true }], rowCount: 1 }
          if (text.includes("INSERT INTO public.workspace_users")) return { rows: [], rowCount: 1 }
          if (text.includes("UPDATE public.workspace_invitations")) return { rows: [], rowCount: 1 }
          return { rows: [], rowCount: 1 }
        },
      }
      return work(client as never)
    })
  })

  test("normalizes email consistently and rejects malformed values", () => {
    expect(normalizeInvitationEmail(" Person@Example.Test ")).toBe("person@example.test")
    expect(() => normalizeInvitationEmail("not-an-email")).toThrow("Invalid email address")
  })

  test("admits only matching existing memberships or live invitations", async () => {
    expect(await canSignInWithEmail(" Person@Example.Test ")).toBe(true)
    expect(mocks.queries[0]?.values).toEqual(["person@example.test"])
    expect(mocks.queries[0]?.text).toContain("public.workspace_users")
    expect(mocks.queries[0]?.text).toContain("i.expires_at > now()")
    expect(await hasWorkspaceMembership(userId)).toBe(true)
    expect(mocks.queries.at(-1)?.values).toEqual([userId])
  })

  test("accepts every matching workspace invite in one worker transaction without overwriting profile or roles", async () => {
    await acceptInvitations({ id: userId, email: "Person@Example.Test", name: "Provider Name", surname: "User", image: "https://example.test/image.png" })

    expect(mocks.queries[0]?.text).toContain("FOR UPDATE")
    expect(mocks.queries[0]?.text).toContain("ORDER BY workspace_id, id")
    expect(mocks.queries.filter(({ text }) => text.includes("INSERT INTO public.workspace_users"))).toHaveLength(2)
    expect(mocks.queries.filter(({ text }) => text.includes("INSERT INTO public.workspace_users")).every(({ text }) => text.includes("ON CONFLICT (workspace_id, user_id) DO NOTHING"))).toBe(true)
    expect(mocks.queries.find(({ text }) => text.includes("INSERT INTO public.users"))?.text).toContain("ON CONFLICT (id) DO NOTHING")
    expect(mocks.queries.filter(({ text }) => text.includes("UPDATE public.workspace_invitations"))).toHaveLength(2)
  })

  test("does not accept an account without a valid invitation or membership", async () => {
    mocks.withActor.mockImplementationOnce(async (_actor, work) => {
      const client = { query: async (text: string) => text.includes("SELECT workspace_id, id FROM public.workspace_invitations") ? { rows: [], rowCount: 0 } : { rows: [{ exists: false }], rowCount: 1 } }
      return work(client as never)
    })

    await expect(acceptInvitations({ id: userId, email: "person@example.test", name: "Person" })).rejects.toThrow("No valid workspace invitation")
    expect(mocks.queries.filter(({ text }) => text.includes("INSERT INTO public.users"))).toHaveLength(0)
  })
})
