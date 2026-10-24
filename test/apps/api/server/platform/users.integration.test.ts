import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { withActor } from "@moc/backend/database"
import type { PlatformOperation } from "../../../../../apps/api/server/platform/context"
import { operations } from "../../../../../apps/api/server/platform/users"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const managerId = randomUUID()
const workspaceId = randomUUID()

async function run<T>(operation: PlatformOperation, input: unknown): Promise<T> {
  if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
  return withActor({ userId: managerId, workspaceId, role: "moc_app" }, async (db) =>
    operation.run({ db, userId: managerId, workspaceId }, input) as Promise<T>)
}

suite("user platform operations against PostgreSQL", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    await pool.query(`INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,'Integration Manager',$2)`, [managerId, `manager-${managerId}@example.test`])
    await pool.query(`INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Integration Manager','Tester',$2)`, [managerId, `manager-${managerId}@example.test`])
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [workspaceId, `Users ${workspaceId}`, `users-${workspaceId}`])
    await pool.query(`INSERT INTO public.workspace_users (workspace_id,user_id,role_id,member_type_id)
      SELECT $1,$2,r.id,t.id FROM public.roles r CROSS JOIN LATERAL (
        SELECT id FROM public.workspace_member_types WHERE workspace_id=$1 AND is_default LIMIT 1
      ) t WHERE r.name='admin'`, [workspaceId, managerId])
  })

  afterAll(async () => {
    if (!pool) return
    await pool.query("ALTER TABLE public.workspace_users DISABLE TRIGGER workspace_users_protect_last_manager")
    try {
      await pool.query("DELETE FROM public.workspaces WHERE id=$1", [workspaceId])
    } finally {
      await pool.query("ALTER TABLE public.workspace_users ENABLE TRIGGER workspace_users_protect_last_manager")
    }
    await pool.query('DELETE FROM moc_auth."user" WHERE id=$1', [managerId])
    await pool.end()
  })

  test("all and withRoles execute with their expected PostgreSQL row shapes", async () => {
    const all = await run<Array<{ id: string }>>(operations.all, null)
    const withRoles = await run<Array<{ id: string; role: { name: string } }>>(operations.withRoles, null)

    expect(all.map((user) => user.id)).toContain(managerId)
    expect(withRoles.find((user) => user.id === managerId)?.role.name).toBe("admin")
  })
})
