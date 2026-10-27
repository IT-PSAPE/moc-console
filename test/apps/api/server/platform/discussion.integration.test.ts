import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { withActor } from "@moc/backend/database"
import type { DiscussionPage, ItemActivity, ItemComment } from "@moc/types/discussion"
import type { PlatformOperation } from "../../../../../apps/api/server/platform/context"
import { operations } from "../../../../../apps/api/server/platform/discussion"
import { operations as bookings } from "../../../../../apps/api/server/platform/bookings"
import { operations as equipment } from "../../../../../apps/api/server/platform/equipment"
import { operations as venueBookings } from "../../../../../apps/api/server/platform/venue-bookings"
import type { Booking } from "@moc/types/equipment/booking"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const workspaceId = randomUUID(), foreignWorkspaceId = randomUUID(), userId = randomUUID(), viewerId = randomUUID(), managerId = randomUUID()
const requestId = randomUUID(), foreignRequestId = randomUUID(), bookingId = randomUUID(), occurrenceId = randomUUID()
const venueId = randomUUID(), venueBookingId = randomUUID()
const target = { kind: "request", itemId: requestId }

async function run<T>(operation: PlatformOperation, input: unknown, actorId = userId): Promise<T> {
  return withActor({ userId: actorId, workspaceId, role: "moc_app" }, async (db) => operation.run({ db, userId: actorId, workspaceId }, input) as Promise<T>)
}

suite("item discussion API against disposable PostgreSQL with production RLS", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    for (const id of [userId, viewerId, managerId]) {
      await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,\'Discussion\',$2)', [id, `${id}@example.test`])
      await pool.query("INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Discussion','Author',$2)", [id, `${id}@example.test`])
    }
    for (const id of [workspaceId, foreignWorkspaceId]) await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$2)", [id, `discussion-${id}`])
    for (const [id, role] of [[userId, "admin"], [viewerId, "viewer"]]) {
      await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name=$3", [workspaceId, id, role])
    }
    const roleId = randomUUID()
    await pool.query("INSERT INTO public.roles (id,name,can_update) VALUES ($1,$2,true)", [roleId, `discussion-manager-${roleId}`])
    await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) VALUES ($1,$2,$3)", [workspaceId, managerId, roleId])
    for (const [id, workspace] of [[requestId, workspaceId], [foreignRequestId, foreignWorkspaceId]]) {
      await pool.query("INSERT INTO public.requests (id,workspace_id,title,requested_by,due_date,category,who,what,when_text,where_text,why,how) VALUES ($1,$2,'Discussion request','Public person',now(),'event','','','','','','')", [id, workspace])
    }
    await pool.query("INSERT INTO public.bookings (id,workspace_id,title,booked_by,tracking_code,checked_out_at,expected_return_at,status) VALUES ($1,$2,'Discussion booking','Borrower',$3,now(),now()+interval '1 day','booked')", [bookingId, workspaceId, `BKG-${bookingId}`])
    await pool.query("INSERT INTO public.venues (id,workspace_id,name) VALUES ($1,$2,'Discussion Hall')", [venueId, workspaceId])
    await pool.query("INSERT INTO public.venue_bookings (id,workspace_id,venue_id,title,requested_by,tracking_code,starts_at,ends_at) VALUES ($1,$2,$3,'Discussion venue','Requester',$4,now()+interval '1 day',now()+interval '2 days')", [venueBookingId, workspaceId, venueId, `VEN-${venueBookingId}`])
    const chatId = `discussion-${randomUUID()}`, scheduleId = randomUUID()
    await pool.query("INSERT INTO public.telegram_groups (chat_id,title,type,active,workspace_id) VALUES ($1,'Discussion group','supergroup',true,$2)", [chatId, workspaceId])
    await pool.query("INSERT INTO public.scheduled_message_schedules (id,workspace_id,group_chat_id,starts_on,frequency,body,message_type) VALUES ($1,$2,$3,current_date,'once','Message','announcement')", [scheduleId, workspaceId, chatId])
    await pool.query("INSERT INTO public.scheduled_message_occurrences (id,workspace_id,schedule_id,occurrence_on,send_on,body,message_type) VALUES ($1,$2,$3,current_date,now(),'Message','announcement')", [occurrenceId, workspaceId, scheduleId])
  })

  afterAll(async () => { await pool?.end() })

  test("concurrent retries create exactly one comment with trusted provenance and readable snapshots", async () => {
    const idempotencyKey = randomUUID(), input = { ...target, body: "  Please review  ", idempotencyKey }
    const [first, retry] = await Promise.all([run<ItemComment>(operations.createComment, input), run<ItemComment>(operations.createComment, input)])
    expect(first).toEqual(retry)
    expect(first).toMatchObject({ id: idempotencyKey, body: "Please review", origin: "comment", actor: { id: userId, name: "Discussion Author", kind: "member" } })
    const stored = await pool!.query("SELECT count(*)::int AS count FROM public.item_comments WHERE id=$1", [idempotencyKey])
    expect(stored.rows[0].count).toBe(1)
    await expect(run(operations.createComment, { ...input, body: "Different" })).rejects.toMatchObject({ status: 409 })
    await pool!.query("UPDATE public.users SET name='Renamed' WHERE id=$1", [userId])
    const page = await run<DiscussionPage<ItemComment>>(operations.listComments, target, viewerId)
    expect(page.items.find((comment) => comment.id === idempotencyKey)?.actor.name).toBe("Discussion Author")
  })

  test("viewer writes and foreign item reads fail without disclosing history", async () => {
    await expect(run(operations.createComment, { ...target, body: "Cannot write", idempotencyKey: randomUUID() }, viewerId)).rejects.toMatchObject({ name: "WorkspaceAccessError" })
    await expect(run(operations.listActivity, { ...target, itemId: foreignRequestId })).rejects.toThrow("Item not found")
    await expect(run(operations.listActivity, { ...target, itemId: randomUUID() })).rejects.toThrow("Item not found")
  })

  test("scheduled history requires can_update while allowing managers with no can_read permission", async () => {
    const input = { kind: "scheduled-message", itemId: occurrenceId }
    await expect(run(operations.listActivity, input, viewerId)).rejects.toMatchObject({ name: "WorkspaceAccessError" })
    const result = await run<DiscussionPage<ItemActivity>>(operations.listActivity, input, managerId)
    expect(result.items.some((event) => event.itemId === occurrenceId)).toBe(true)
    await expect(run(operations.createComment, { ...input, body: "Manager comment", idempotencyKey: randomUUID() }, managerId)).resolves.toMatchObject({ body: "Manager comment" })
  })

  test("a shared microsecond timestamp paginates without missing or repeating entries", async () => {
    await pool!.query("INSERT INTO public.item_activity (workspace_id,item_kind,item_id,event_type,created_at) SELECT $1,'request',$2,'pagination','2099-01-01T00:00:00.123456Z' FROM generate_series(1,31)", [workspaceId, requestId])
    const first = await run<DiscussionPage<ItemActivity>>(operations.listActivity, target)
    expect(first.items).toHaveLength(30)
    expect(first.nextCursor).not.toBeNull()
    const second = await run<DiscussionPage<ItemActivity>>(operations.listActivity, { ...target, cursor: first.nextCursor })
    const events = [...first.items, ...second.items].filter((event) => event.type === "pagination")
    expect(events).toHaveLength(31)
    expect(new Set(events.map((event) => event.id)).size).toBe(31)
  })

  test("legacy equipment bookings share activity pagination and use creation dates rather than future collection dates", async () => {
    const equipmentId = randomUUID()
    await pool!.query("INSERT INTO public.equipment (id,workspace_id,name,serial_number,category,status,location) VALUES ($1::uuid,$2,'History camera',$1::text,'camera','available','Shelf')", [equipmentId, workspaceId])
    const inserted = await pool!.query<{ id: string }>(`WITH saved AS (
      INSERT INTO public.bookings (workspace_id,title,booked_by,tracking_code,checked_out_at,expected_return_at,created_at,status)
      SELECT $1,'Legacy booking '||number,'Legacy borrower','BKG-'||gen_random_uuid(),'2099-01-01','2099-01-02','2020-01-01 00:00:00.123456+00','archived'
      FROM generate_series(1,31) AS number RETURNING id
    ) INSERT INTO public.booking_items (booking_id,equipment_id) SELECT id,$2 FROM saved RETURNING booking_id AS id`, [workspaceId, equipmentId])
    // Reproduce existing records from before audit recording was installed.
    await pool!.query("DELETE FROM public.item_activity WHERE item_kind='equipment' AND item_id=$1 AND details ? 'booking_id'", [equipmentId])
    const input = { kind: 'equipment', itemId: equipmentId }
    const first = await run<DiscussionPage<ItemActivity>>(operations.listActivity, input, viewerId)
    expect(first.items[0].type).toBe('created')
    expect(first.nextCursor).not.toBeNull()
    const second = await run<DiscussionPage<ItemActivity>>(operations.listActivity, { ...input, cursor: first.nextCursor }, viewerId)
    const records = [...first.items, ...second.items].filter(event => event.type === 'booking_recorded')
    expect(new Set(records.map(event => event.id))).toEqual(new Set(inserted.rows.map(row => row.id)))
    expect(records).toHaveLength(31)
    expect(records[0]).toMatchObject({ itemId: equipmentId, createdAt: '2020-01-01T00:00:00.123Z', actor: { id: null, name: 'Legacy borrower', kind: 'unknown' }, details: { status: 'archived' } })
    expect(second.nextCursor).toBeNull()
  })

  test("an audited equipment booking appears once and foreign equipment stays inaccessible", async () => {
    const equipmentId = randomUUID(), foreignEquipmentId = randomUUID()
    for (const [id, workspace] of [[equipmentId, workspaceId], [foreignEquipmentId, foreignWorkspaceId]]) {
      await pool!.query("INSERT INTO public.equipment (id,workspace_id,name,serial_number,category,status,location) VALUES ($1::uuid,$2,'Audited camera',$1::text,'camera','available','Shelf')", [id, workspace])
    }
    await pool!.query("INSERT INTO public.booking_items (booking_id,equipment_id) VALUES ($1,$2)", [bookingId, equipmentId])
    const page = await run<DiscussionPage<ItemActivity>>(operations.listActivity, { kind: 'equipment', itemId: equipmentId })
    const links = page.items.filter(event => event.details.booking_id === bookingId)
    expect(links).toHaveLength(1)
    expect(links[0].type).toBe('equipment_added')
    await expect(run(operations.listActivity, { kind: 'equipment', itemId: foreignEquipmentId })).rejects.toThrow('Item not found')
  })

  test("equipment and booking operations run against the schema after Notes is removed", async () => {
    const record = { id: randomUUID(), name: "Camera", serialNumber: `DISCUSSION-${randomUUID()}`, category: "camera", status: "available", location: "Shelf A", lastActiveDate: "2026-10-26T10:00:00.000Z", thumbnail: null }
    await expect(run(equipment.create, { equipment: record })).resolves.toMatchObject({ id: record.id, location: "Shelf A" })
    const updated = await run(equipment.update, { equipment: { ...record, location: "Shelf B" } })
    expect(updated).toMatchObject({ id: record.id, location: "Shelf B" })
    expect(updated).not.toHaveProperty("notes")
    const booking = await run<Booking>(bookings.getById, { id: bookingId })
    const saved = await run(bookings.update, { booking: { ...booking, bookedBy: "Updated borrower" } })
    expect(saved).toMatchObject({ bookedBy: "Updated borrower" })
    expect(saved).not.toHaveProperty("notes")
    const venue = await run(venueBookings.getById, { id: venueBookingId })
    expect(venue).toMatchObject({ id: venueBookingId, venueName: "Discussion Hall" })
    expect(venue).not.toHaveProperty("notes")
  })

  test.each(["checked_out", "returned"])("repeating booking status %s preserves timestamps and activity count", async (status) => {
    await run(bookings.updateStatus, { id: bookingId, status })
    const before = await pool!.query("SELECT checked_out_at::text,returned_at::text,(SELECT count(*)::int FROM public.item_activity WHERE item_kind='booking' AND item_id=$1) AS count FROM public.bookings WHERE id=$1", [bookingId])
    await run(bookings.updateStatus, { id: bookingId, status })
    const after = await pool!.query("SELECT checked_out_at::text,returned_at::text,(SELECT count(*)::int FROM public.item_activity WHERE item_kind='booking' AND item_id=$1) AS count FROM public.bookings WHERE id=$1", [bookingId])
    expect(after.rows).toEqual(before.rows)
  })
})
