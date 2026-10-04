import { describe, expect, test } from "bun:test"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context"
import { operations } from "../../../../../apps/api/server/platform/checklists.ts"

function makeContext(query: (text: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>): PlatformContext {
  return {
    db: { query } as unknown as PlatformContext["db"],
    userId: "user-1",
    workspaceId: "verified-workspace",
  }
}

describe("checklist platform operations", () => {
  test("scopes checklist lookups to the verified workspace", async () => {
    const values: Array<readonly unknown[]> = []
    const context = makeContext(async (_text, params) => {
      values.push(params ?? [])
      return { rows: [] }
    })

    const checklist = await operations.getById.run(context, {
      id: "00000000-0000-4000-8000-000000000001",
      workspaceId: "forged-workspace",
    })

    expect(values).toEqual([
      ["verified-workspace", "00000000-0000-4000-8000-000000000001"],
      ["verified-workspace", "00000000-0000-4000-8000-000000000001"],
    ])
    expect(checklist).toBeUndefined()
  })

  test("creates a run through the established transactional template function", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = []
    const context = makeContext(async (text, params) => {
      calls.push({ sql: text, values: params ?? [] })
      return { rows: [{ id: text.startsWith("SELECT id FROM checklist_templates") ? "template-1" : "run-1" }] }
    })

    const id = await operations.createFromTemplate.run(context, {
      templateId: "00000000-0000-4000-8000-000000000001",
      overrides: { name: "Morning Run", description: "Open the space", scheduledAt: "2026-10-04T07:00:00.000Z" },
    })

    expect(calls[0].sql).toContain("workspace_id=$1 AND id=$2 FOR SHARE")
    expect(calls[1].sql).toBe("SELECT public.create_checklist_from_template($1::uuid,$2::timestamptz,$3::text,$4::text) AS id")
    expect(calls[1].values).toEqual(["00000000-0000-4000-8000-000000000001", "2026-10-04T07:00:00.000Z", "Morning Run", "Open the space"])
    expect(id).toBe("run-1")
    expect(operations.createFromTemplate.permission).toBe("can_create")
  })

  test("maps ordered templates and runs, preserving item completion only for runs", async () => {
    const templateId = "00000000-0000-4000-8000-000000000001"
    const runId = "00000000-0000-4000-8000-000000000002"
    const context = makeContext(async (text) => {
      if (text.includes("FROM checklist_templates WHERE")) return { rows: [{ id: templateId, workspace_id: "verified-workspace", name: "Open", description: "", created_at: "2026-01-01", updated_at: "2026-01-01" }] }
      if (text.includes("FROM checklists WHERE")) return { rows: [{ id: runId, workspace_id: "verified-workspace", name: "Open Run", description: "", scheduled_at: "2026-10-04T07:00:00Z", request_id: null, created_at: "2026-10-04", updated_at: "2026-10-04" }] }
      if (text.includes("FROM template_sections")) return { rows: [{ id: "00000000-0000-4000-8000-000000000003", checklist_template_id: templateId, name: "Room", sort_order: 1 }] }
      if (text.includes("FROM template_items")) return { rows: [{ id: "00000000-0000-4000-8000-000000000004", checklist_template_id: templateId, template_section_id: null, label: "Unlock", sort_order: 1 }] }
      if (text.includes("FROM checklist_sections")) return { rows: [] }
      if (text.includes("FROM checklist_items")) return { rows: [{ id: "00000000-0000-4000-8000-000000000005", checklist_id: runId, section_id: null, label: "Lock", checked: true, sort_order: 1 }] }
      throw new Error(`Unexpected query: ${text}`)
    })

    const checklists = await operations.list.run(context, {}) as Array<{ id: string; kind: string; items: Array<{ checked: boolean }>; sections: unknown[]; scheduledAt?: string }>

    expect(checklists.map(({ id, kind }) => [id, kind])).toEqual([[templateId, "template"], [runId, "instance"]])
    expect(checklists[0].items).toEqual([{ id: "00000000-0000-4000-8000-000000000004", label: "Unlock", checked: false }])
    expect(checklists[1]).toMatchObject({ scheduledAt: "2026-10-04T07:00:00Z", items: [{ checked: true }] })
  })

  test("normalizes PostgreSQL timestamp values to ISO strings", async () => {
    const createdAt = new Date("2026-10-04T10:15:30.000Z")
    const updatedAt = new Date("2026-10-04T10:20:30.000Z")
    const scheduledAt = new Date("2026-10-05T10:15:30.000Z")
    const context = makeContext(async (text) => {
      if (text.includes("FROM checklist_templates WHERE")) return { rows: [{ id: "template-1", workspace_id: "verified-workspace", name: "Open", description: "", created_at: createdAt, updated_at: updatedAt }] }
      if (text.includes("FROM checklists WHERE")) return { rows: [{ id: "run-1", workspace_id: "verified-workspace", name: "Open Run", description: "", scheduled_at: scheduledAt, request_id: null, created_at: createdAt, updated_at: updatedAt }] }
      return { rows: [] }
    })

    const checklists = await operations.list.run(context, {}) as Array<{ kind: string; createdAt: string; updatedAt: string; scheduledAt?: string }>

    expect(checklists).toEqual([
      { id: "template-1", kind: "template", name: "Open", description: "", items: [], sections: [], createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() },
      { id: "run-1", kind: "instance", name: "Open Run", description: "", scheduledAt: scheduledAt.toISOString(), requestId: undefined, items: [], sections: [], createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() },
    ])
  })

  test("preserves checklist item assignments as idempotent inserts", async () => {
    let sql = ""
    const context = makeContext(async (text) => {
      sql = text
      return { rows: [] }
    })

    const inserted = await operations.addAssignee.run(context, {
      itemId: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
    })

    expect(sql).toContain("ON CONFLICT (checklist_item_id,user_id) DO NOTHING RETURNING id")
    expect(sql).toContain("member.workspace_id=$1 AND member.user_id=$3")
    expect(inserted).toBe(false)
    expect(operations.addAssignee.permission).toBe("can_create")
  })
})
