import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { randomUUID } from "node:crypto"
import { Pool, type PoolClient } from "pg"
import { withActor } from "../../../packages/backend/src/database.js"
import { acceptInvitations, canSignInWithEmail } from "../../../packages/backend/src/auth/invitations.js"
import { operations } from "../../../apps/api/server/platform/users.js"

const databaseUrl = process.env.MOC_AUTH_TEST_DATABASE_URL
const branchMarker = "dev-invite-auth-20261024"
const expectedNeonHostPrefix = "ep-snowy-rice-b1x8j3vl"
const hasDatabase = Boolean(databaseUrl)
const managerAEmail = "auth-invitations-manager-a@example.test"
const managerBEmail = "auth-invitations-manager-b@example.test"

describe("workspace invitation storage against isolated Neon", { skip: !hasDatabase, timeout: 60_000 }, () => {
  const originalEnv = { ...process.env }
  let pool: Pool
  let workspaceA: string
  let workspaceB: string
  let managerA: string
  let managerB: string
  const temporaryUserIds: string[] = []
  const temporaryMemberTypeIds: string[] = []

  async function createWorkspace(slug: string): Promise<string> {
    const existing = await pool.query<{ id: string }>("SELECT id FROM public.workspaces WHERE slug = $1", [slug])
    if (existing.rows[0]) return existing.rows[0].id
    const result = await pool.query<{ id: string }>("INSERT INTO public.workspaces (name, slug) VALUES ($1, $2) RETURNING id", [`Invitation test ${slug}`, slug])
    const id = result.rows[0]?.id
    if (!id) throw new Error("Invitation test workspace was not created")
    return id
  }

  async function createIdentity(email: string, name: string, surname = "Test"): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO moc_auth."user" (name, surname, email, email_verified) VALUES ($1, $2, $3, true) RETURNING id`,
      [name, surname, email],
    )
    const id = result.rows[0]?.id
    if (!id) throw new Error("Invitation test identity was not created")
    await pool.query("INSERT INTO public.users (id, name, surname, email) VALUES ($1::uuid, $2, $3, $4)", [id, name, surname, email])
    temporaryUserIds.push(id)
    return id
  }

  async function ensureManager(email: string, workspaceId: string, label: string): Promise<string> {
    let id = (await pool.query<{ id: string }>('SELECT id FROM moc_auth."user" WHERE email = $1', [email])).rows[0]?.id
    if (!id) {
      id = await createIdentity(email, `Invitation Manager ${label}`)
      temporaryUserIds.pop()
    } else {
      await pool.query("INSERT INTO public.users (id, name, surname, email) VALUES ($1::uuid, $2, 'Test', $3) ON CONFLICT (id) DO NOTHING", [id, `Invitation Manager ${label}`, email])
    }
    const membership = await pool.query("SELECT 1 FROM public.workspace_users WHERE workspace_id = $1::uuid AND user_id = $2::uuid", [workspaceId, id])
    if (membership.rowCount === 0) {
      await pool.query(
        `INSERT INTO public.workspace_users (workspace_id, user_id, role_id, member_type_id)
         SELECT $1::uuid, $2::uuid, role.id, member_type.id FROM public.roles role
         CROSS JOIN LATERAL (SELECT id FROM public.workspace_member_types WHERE workspace_id = $1::uuid AND is_default LIMIT 1) member_type
         WHERE role.name = 'admin'`,
        [workspaceId, id],
      )
    }
    return id
  }

  function managerContext(userId: string, workspaceId: string) {
    return { userId, workspaceId, db: {} as PoolClient }
  }

  async function makeInvitation(workspaceId: string, email: string, state: "active" | "expired" | "revoked"): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO public.workspace_invitations (workspace_id, email, created_at, expires_at, revoked_at)
       VALUES ($1::uuid, $2, CASE WHEN $3 = 'expired' THEN now() - interval '2 days' ELSE now() END,
         CASE WHEN $3 = 'expired' THEN now() - interval '1 day' ELSE now() + interval '7 days' END,
         CASE WHEN $3 = 'revoked' THEN now() ELSE NULL END)
       RETURNING id`,
      [workspaceId, email, state],
    )
    const id = result.rows[0]?.id
    if (!id) throw new Error("Invitation test row was not created")
    return id
  }

  beforeAll(async () => {
    if (!databaseUrl) return
    let databaseHost = ""
    try { databaseHost = new URL(databaseUrl).hostname } catch { throw new Error("MOC_AUTH_TEST_DATABASE_URL must identify the isolated invite-auth branch") }
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"])
    const isMarkedLocalTestDatabase = process.env.MOC_AUTH_TEST_BRANCH === "local" && localHosts.has(databaseHost)
    const isMarkedNeonTestDatabase = process.env.MOC_AUTH_TEST_BRANCH === branchMarker
      && databaseHost.startsWith(`${expectedNeonHostPrefix}.`) && databaseHost.endsWith(".neon.tech")
    if (!isMarkedLocalTestDatabase && !isMarkedNeonTestDatabase) {
      throw new Error("MOC_AUTH_TEST_DATABASE_URL and MOC_AUTH_TEST_BRANCH must identify the isolated local or invite-auth Neon test branch")
    }
    Object.assign(process.env, { DATABASE_URL: databaseUrl })
    process.env.MOC_CONSOLE_ORIGIN = "https://console.example.test"
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_PORT", "SMTP_FROM"]) delete process.env[key]
    pool = new Pool({ connectionString: databaseUrl })
    workspaceA = await createWorkspace("auth-invitations-integration-a")
    workspaceB = await createWorkspace("auth-invitations-integration-b")
    managerA = await ensureManager(managerAEmail, workspaceA, "A")
    managerB = await ensureManager(managerBEmail, workspaceB, "B")
  }, 30_000)

  afterAll(async () => {
    if (pool) {
      try {
        const workspaceIds = [workspaceA, workspaceB].filter((id): id is string => Boolean(id))
        if (workspaceIds.length) await pool.query("DELETE FROM public.workspace_invitations WHERE workspace_id = ANY($1::uuid[])", [workspaceIds])
        if (temporaryUserIds.length) await pool.query('DELETE FROM moc_auth."user" WHERE id = ANY($1::uuid[])', [temporaryUserIds])
        if (temporaryMemberTypeIds.length) await pool.query("DELETE FROM public.workspace_member_types WHERE id = ANY($1::uuid[])", [temporaryMemberTypeIds])
      } finally {
        await pool.end()
      }
    }
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
    Object.assign(process.env, originalEnv)
  })

  test("persists before email, restricts manager and nonmanager access by workspace, and isolates invitation lists", async () => {
    const invitedEmail = `api-invite-${randomUUID()}@example.test`
    const workspaceBEmail = `workspace-b-invite-${randomUUID()}@example.test`
    const managerOperation = operations.invite
    const result = await managerOperation.run(managerContext(managerA, workspaceA), { email: invitedEmail }) as { invitation: { email: string }; emailSent: boolean }
    expect(result.invitation.email).toBe(invitedEmail)
    expect(result.emailSent).toBe(false)
    expect(await canSignInWithEmail(invitedEmail)).toBe(true)
    await managerOperation.run(managerContext(managerB, workspaceB), { email: workspaceBEmail })

    await expect(managerOperation.run(managerContext(managerA, workspaceB), { email: `cross-workspace-${randomUUID()}@example.test` }))
      .rejects.toMatchObject({ status: 403, code: "forbidden" })

    const viewer = await createIdentity(`invitation-viewer-${randomUUID()}@example.test`, "Invitation Viewer")
    await pool.query(
      `INSERT INTO public.workspace_users (workspace_id, user_id, role_id, member_type_id)
       SELECT $1::uuid, $2::uuid, role.id, member_type.id FROM public.roles role
       CROSS JOIN LATERAL (SELECT id FROM public.workspace_member_types WHERE workspace_id = $1::uuid AND is_default LIMIT 1) member_type
       WHERE role.name = 'viewer'`,
      [workspaceA, viewer],
    )
    const rows = await withActor({ userId: viewer, workspaceId: workspaceA, role: "moc_app" }, async (client) => {
      const select = await client.query("SELECT id FROM public.workspace_invitations WHERE workspace_id = $1::uuid", [workspaceA])
      return select.rows
    })
    expect(rows).toHaveLength(0)
    await expect(withActor({ userId: viewer, workspaceId: workspaceA, role: "moc_app" }, (client) =>
      client.query("INSERT INTO public.workspace_invitations (workspace_id, email) VALUES ($1::uuid, $2)", [workspaceA, `blocked-${randomUUID()}@example.test`]),
    )).rejects.toMatchObject({ code: "42501" })

    const managerAInvitations = await withActor({ userId: managerA, workspaceId: workspaceA, role: "moc_app" }, async (client) =>
      operations.invitations.run({ db: client, userId: managerA, workspaceId: workspaceA }, null) as Promise<Array<{ email: string }>>,
    )
    expect(managerAInvitations.map((item) => item.email)).toContain(invitedEmail)
    expect(managerAInvitations.map((item) => item.email)).not.toContain(workspaceBEmail)

    const expiredEmail = `resend-expired-${randomUUID()}@example.test`
    const expiredInvitationId = await makeInvitation(workspaceA, expiredEmail, "expired")
    const resent = await operations.resendInvitation.run(managerContext(managerA, workspaceA), { invitationId: expiredInvitationId }) as { emailSent: boolean }
    expect(resent.emailSent).toBe(false)
    expect(await canSignInWithEmail(expiredEmail)).toBe(true)
    await operations.revokeInvitation.run(managerContext(managerA, workspaceA), { invitationId: expiredInvitationId })
    expect(await canSignInWithEmail(expiredEmail)).toBe(false)
  })

  test("accepts concurrent multi-workspace invitations once with viewer defaults and preserves existing roles, types, names, and IDs", async () => {
    const email = `concurrent-invite-${randomUUID()}@example.test`
    const userId = await createIdentity(email, "Google Name", "Google Surname")
    await makeInvitation(workspaceA, email, "active")
    await makeInvitation(workspaceB, email, "active")

    await Promise.all([
      acceptInvitations({ id: userId, email, name: "Google Name", surname: "Google Surname" }),
      acceptInvitations({ id: userId, email, name: "Other Google Name", surname: "Other Google Surname" }),
    ])

    const memberships = await pool.query<{ workspace_id: string; role: string; member_type_id: string; is_default: boolean }>(
      `SELECT membership.workspace_id, role.name AS role, membership.member_type_id,
         member_type.is_default FROM public.workspace_users membership
       JOIN public.roles role ON role.id = membership.role_id
       JOIN public.workspace_member_types member_type ON member_type.id = membership.member_type_id
       WHERE membership.user_id = $1::uuid AND membership.workspace_id = ANY($2::uuid[])
       ORDER BY membership.workspace_id`,
      [userId, [workspaceA, workspaceB]],
    )
    expect(memberships.rows).toHaveLength(2)
    expect(memberships.rows.every((membership) => membership.role === "viewer" && membership.is_default)).toBe(true)
    const accepted = await pool.query("SELECT accepted_at FROM public.workspace_invitations WHERE normalized_email = $1 AND workspace_id = ANY($2::uuid[])", [email, [workspaceA, workspaceB]])
    expect(accepted.rows).toHaveLength(2)
    expect(accepted.rows.every((row) => row.accepted_at !== null)).toBe(true)

    const existingEmail = `existing-member-${randomUUID()}@example.test`
    const existingUserId = await createIdentity(existingEmail, "Edited Name", "Edited Surname")
    const customType = await pool.query<{ id: string }>("INSERT INTO public.workspace_member_types (workspace_id, name) VALUES ($1::uuid, $2) RETURNING id", [workspaceB, `Custom ${randomUUID()}`])
    const customTypeId = customType.rows[0]?.id
    if (!customTypeId) throw new Error("Custom member type was not created")
    temporaryMemberTypeIds.push(customTypeId)
    await pool.query(
      `INSERT INTO public.workspace_users (workspace_id, user_id, role_id, member_type_id)
       SELECT $1::uuid, $2::uuid, role.id, $3::uuid FROM public.roles role WHERE role.name = 'admin'`,
      [workspaceB, existingUserId, customTypeId],
    )
    await makeInvitation(workspaceB, existingEmail, "active")
    await acceptInvitations({ id: existingUserId, email: existingEmail, name: "Provider Name", surname: "Provider Surname" })
    const existing = await pool.query<{ id: string; auth_name: string; name: string; surname: string; role: string; member_type_id: string }>(
      `SELECT auth_user.id, auth_user.name AS auth_name, profile.name, profile.surname, role.name AS role, membership.member_type_id
       FROM moc_auth."user" auth_user JOIN public.users profile ON profile.id = auth_user.id
       JOIN public.workspace_users membership ON membership.user_id = profile.id
       JOIN public.roles role ON role.id = membership.role_id
       WHERE auth_user.id = $1::uuid AND membership.workspace_id = $2::uuid`,
      [existingUserId, workspaceB],
    )
    expect(existing.rows).toEqual([{ id: existingUserId, auth_name: "Edited Name", name: "Edited Name", surname: "Edited Surname", role: "admin", member_type_id: customTypeId }])
  })

  test("rejects expired and revoked invitations for sign-in and acceptance", async () => {
    const expired = `expired-${randomUUID()}@example.test`
    const revoked = `revoked-${randomUUID()}@example.test`
    await makeInvitation(workspaceA, expired, "expired")
    await makeInvitation(workspaceA, revoked, "revoked")
    expect(await canSignInWithEmail(expired)).toBe(false)
    expect(await canSignInWithEmail(revoked)).toBe(false)
    await expect(acceptInvitations({ id: randomUUID(), email: expired, name: "Expired" })).rejects.toThrow("No valid workspace invitation")
    await expect(acceptInvitations({ id: randomUUID(), email: revoked, name: "Revoked" })).rejects.toThrow("No valid workspace invitation")
  })
})
