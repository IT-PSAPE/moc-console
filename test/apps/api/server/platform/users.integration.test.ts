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
const approvedUserId = randomUUID()
const rejectedUserId = randomUUID()
const workspaceId = randomUUID()
let approvedRequestId = ""
let rejectedRequestId = ""

async function run<T>(operation: PlatformOperation, input: unknown): Promise<T> {
  if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
  return withActor({ userId: managerId, workspaceId, role: "moc_app" }, async (db) =>
    operation.run({ db, userId: managerId, workspaceId }, input) as Promise<T>)
}

suite("user platform operations against PostgreSQL", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    await pool.query(`INSERT INTO moc_auth."user" (id,name,email) VALUES
      ($1,'Integration Manager',$4),($2,'Approved Applicant',$5),($3,'Rejected Applicant',$6)`, [
      managerId, approvedUserId, rejectedUserId,
      `manager-${managerId}@example.test`, `approved-${approvedUserId}@example.test`, `rejected-${rejectedUserId}@example.test`,
    ])
    await pool.query(`INSERT INTO public.users (id,name,surname,email) VALUES
      ($1,'Integration Manager','Tester',$4),($2,'Approved Applicant','Tester',$5),($3,'Rejected Applicant','Tester',$6)`, [
      managerId, approvedUserId, rejectedUserId,
      `manager-${managerId}@example.test`, `approved-${approvedUserId}@example.test`, `rejected-${rejectedUserId}@example.test`,
    ])
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [workspaceId, `Users ${workspaceId}`, `users-${workspaceId}`])
    await pool.query(`INSERT INTO public.workspace_users (workspace_id,user_id,role_id)
      SELECT $1,$2,id FROM public.roles WHERE name='admin'`, [workspaceId, managerId])
    const approvedRequest = await pool.query<{ id: string }>(`INSERT INTO public.workspace_join_requests (workspace_id,user_id)
      VALUES ($1,$2) RETURNING id`, [workspaceId, approvedUserId])
    const rejectedRequest = await pool.query<{ id: string }>(`INSERT INTO public.workspace_join_requests (workspace_id,user_id)
      VALUES ($1,$2) RETURNING id`, [workspaceId, rejectedUserId])
    approvedRequestId = approvedRequest.rows[0]!.id
    rejectedRequestId = rejectedRequest.rows[0]!.id
  })

  afterAll(async () => {
    if (!pool) return
    await pool.query("ALTER TABLE public.workspace_users DISABLE TRIGGER workspace_users_protect_last_manager")
    try {
      await pool.query("DELETE FROM public.workspaces WHERE id=$1", [workspaceId])
    } finally {
      await pool.query("ALTER TABLE public.workspace_users ENABLE TRIGGER workspace_users_protect_last_manager")
    }
    await pool.query('DELETE FROM moc_auth."user" WHERE id=ANY($1::uuid[])', [[managerId, approvedUserId, rejectedUserId]])
    await pool.end()
  })

  test("all, withRoles, and pending execute with their expected PostgreSQL row shapes", async () => {
    const all = await run<Array<{ id: string }>>(operations.all, null)
    const withRoles = await run<Array<{ id: string; role: { name: string } }>>(operations.withRoles, null)
    const pending = await run<Array<{ requestId: string; id: string }>>(operations.pending, null)

    expect(all.map((user) => user.id)).toContain(managerId)
    expect(withRoles.find((user) => user.id === managerId)?.role.name).toBe("admin")
    expect(pending.map((user) => user.requestId).sort()).toEqual([approvedRequestId, rejectedRequestId].sort())
  })

  test("approval and rejection preserve manager authority and their distinct effects", async () => {
    await run(operations.approveJoinRequest, { requestId: approvedRequestId })
    await run(operations.rejectJoinRequest, { requestId: rejectedRequestId })

    const state = await withActor({ userId: managerId, workspaceId, role: "moc_app" }, async (db) => {
      const approved = await db.query("SELECT 1 FROM public.workspace_users WHERE workspace_id=$1 AND user_id=$2", [workspaceId, approvedUserId])
      const rejected = await db.query("SELECT 1 FROM public.workspace_users WHERE workspace_id=$1 AND user_id=$2", [workspaceId, rejectedUserId])
      const requests = await db.query("SELECT id FROM public.workspace_join_requests WHERE id=ANY($1::uuid[])", [[approvedRequestId, rejectedRequestId]])
      return { approved: approved.rowCount, rejected: rejected.rowCount, requests: requests.rowCount }
    })
    expect(state.approved).toBe(1)
    expect(state.rejected).toBe(0)
    expect(state.requests).toBe(0)
  })
})
