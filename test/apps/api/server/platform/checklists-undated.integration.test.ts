import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { afterAll, describe, expect, test } from "vitest"
import type { Checklist } from "../../../../../packages/types/src/checklists"
import { getDatabase, withActor } from "../../../../../packages/backend/src/database"
import { operations } from "../../../../../apps/api/server/platform/checklists"
import { loadChecklist } from "../../../../../apps/api/server/telegram-mini-app/store/checklist-store"
import type { PlatformOperation } from "../../../../../apps/api/server/platform/context"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null

async function run(operation: PlatformOperation, workspaceId: string, userId: string, input: unknown): Promise<unknown> {
  return withActor({ userId, workspaceId, role: "moc_worker" }, async (db) => operation.run({ db, workspaceId, userId }, input))
}

suite("undated checklist runs in disposable PostgreSQL", () => {
  afterAll(async () => {
    await pool?.end()
    if (databaseUrl) await getDatabase().end()
  })

  test("API creates undated blank and template runs; Telegram loader accepts NULL and historical dates survive saves", async () => {
    if (!pool || !databaseUrl) throw new Error("MOC_TEST_DATABASE_URL is required")
    process.env.DATABASE_URL = databaseUrl

    const workspaceResult = await pool.query<{ id: string }>("SELECT id FROM public.workspaces WHERE slug='default-workspace'")
    const workspaceId = workspaceResult.rows[0]?.id
    if (!workspaceId) throw new Error("default-workspace fixture is missing")
    const userId = randomUUID()
    const templateId = randomUUID()
    const blankId = randomUUID()
    const historicId = randomUUID()
    const templateSectionId = randomUUID()
    const templateItemId = randomUUID()
    const topLevelItemId = randomUUID()
    const historicDate = "2024-01-02T03:04:05.000Z"

    await pool.query("INSERT INTO public.checklist_templates (id,workspace_id,name,description) VALUES ($1,$2,'Template','')", [templateId, workspaceId])
    await pool.query("INSERT INTO public.template_sections (id,checklist_template_id,name,sort_order) VALUES ($1,$2,'Opening',1)", [templateSectionId, templateId])
    await pool.query("INSERT INTO public.template_items (id,checklist_template_id,template_section_id,label,sort_order) VALUES ($1,$2,$3,'Unlock',1),($4,$2,NULL,'Handover',2)", [templateItemId, templateId, templateSectionId, topLevelItemId])
    await pool.query("INSERT INTO public.checklists (id,workspace_id,name,description,scheduled_at) VALUES ($1,$2,'Historic','',$3)", [historicId, workspaceId, historicDate])

    const blank = await run(operations.save, workspaceId, userId, {
      checklist: { id: blankId, kind: "instance", name: "Blank", description: "", items: [], sections: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    }) as Checklist
    expect(blank.scheduledAt).toBeUndefined()
    expect((await loadChecklist(blankId))?.scheduledAt).toBeUndefined()

    const templateRunId = await run(operations.createFromTemplate, workspaceId, userId, {
      templateId,
      overrides: { name: "Template run", description: "" },
    }) as string
    const templateRun = await loadChecklist(templateRunId)
    expect(templateRun?.scheduledAt).toBeUndefined()
    expect(templateRun?.sections).toHaveLength(1)
    expect(templateRun?.items.map((item) => item.label)).toEqual(["Unlock", "Handover"])

    await run(operations.save, workspaceId, userId, {
      checklist: { id: historicId, kind: "instance", name: "Historic edited", description: "", items: [], sections: [], createdAt: historicDate, updatedAt: historicDate },
    })
    const savedHistoric = await loadChecklist(historicId)
    expect(savedHistoric?.scheduledAt).toBe(historicDate)
  })
})
