import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import type { Checklist } from "@moc/types/checklists"
import { withActor } from "@moc/backend/database"
import type { PlatformOperation } from "../../../../../apps/api/server/platform/context"
import { operations as checklists } from "../../../../../apps/api/server/platform/checklists"
import { operations as bookings } from "../../../../../apps/api/server/platform/bookings"
import { operations as venues } from "../../../../../apps/api/server/platform/venue-bookings"
import { operations as streams } from "../../../../../apps/api/server/platform/streams"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const userId = randomUUID(), viewerId = randomUUID(), workspaceId = randomUUID(), foreignWorkspaceId = randomUUID()
const requestId = randomUUID(), foreignRequestId = randomUUID(), bookingId = randomUUID(), venueBookingId = randomUUID(), lifecycleVenueBookingId = randomUUID(), streamId = randomUUID(), meetingId = randomUUID()
const checklistId = randomUUID()
const cases = [
  { table: "checklists", id: checklistId, set: checklists.setRequest, get: checklists.getById },
  { table: "bookings", id: bookingId, set: bookings.setRequest, get: bookings.getById },
  { table: "venue_bookings", id: venueBookingId, set: venues.setRequest, get: venues.getById },
  { table: "streams", id: streamId, set: streams.setStreamRequest, get: streams.get },
  { table: "zoom_meetings", id: meetingId, set: streams.setMeetingRequest, get: streams.getZoomMeeting },
]

async function run(operation: PlatformOperation, input: unknown, actorId = userId): Promise<unknown> {
  return withActor({ userId: actorId, workspaceId, role: "moc_app" }, async (db) => operation.run({ db, workspaceId, userId: actorId }, input))
}

async function fixture(text: string, values: unknown[]): Promise<unknown> {
  return withActor({ userId, workspaceId, role: "moc_worker" }, async (db) => db.query(text, values))
}

suite("request relationships in disposable PostgreSQL with production RLS", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    for (const id of [userId, viewerId]) {
      await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,\'Link test\',$2)', [id, `${id}@example.test`])
      await pool.query("INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Link','Test',$2)", [id, `${id}@example.test`])
    }
    for (const id of [workspaceId, foreignWorkspaceId]) await fixture("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$2)", [id, `links-${id}`])
    await fixture("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name='admin'", [workspaceId, userId])
    await fixture("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name='viewer'", [workspaceId, viewerId])
    for (const [id, workspace] of [[requestId, workspaceId], [foreignRequestId, foreignWorkspaceId]]) await fixture("INSERT INTO public.requests (id,workspace_id,title,requested_by,due_date,tracking_code,priority,category,who,what,when_text,where_text,why,how) VALUES ($1,$2,'Same title','Requester',now(),$3,'medium','event','','','','','','')", [id, workspace, `REQ-${id}`])
    await fixture("INSERT INTO public.bookings (id,workspace_id,title,booked_by,tracking_code,checked_out_at,expected_return_at,status,notes) VALUES ($1,$2,'Equipment','Borrower',$3,now(),now()+interval '1 day','checked_out','Keep notes')", [bookingId, workspaceId, `BKG-${bookingId}`])
    await fixture("INSERT INTO public.checklists (id,workspace_id,name,description,scheduled_at) VALUES ($1,$2,'Linked checklist','Keep description',now())", [checklistId, workspaceId])
    await fixture("INSERT INTO public.checklist_items (checklist_id,label,checked,sort_order) VALUES ($1,'Completed work',true,0)", [checklistId])
    const venueId = randomUUID()
    await fixture("INSERT INTO public.venues (id,workspace_id,name) VALUES ($1,$2,'Hall')", [venueId, workspaceId])
    await fixture("INSERT INTO public.venue_bookings (id,workspace_id,venue_id,title,requested_by,tracking_code,starts_at,ends_at,status,notes,approved_at) VALUES ($1,$2,$3,'Venue','Requester',$4,now()+interval '1 day',now()+interval '2 days','approved','Keep notes',now())", [venueBookingId, workspaceId, venueId, `VEN-${venueBookingId}`])
    await fixture("INSERT INTO public.venue_bookings (id,workspace_id,venue_id,title,requested_by,tracking_code,starts_at,ends_at,status) VALUES ($1,$2,$3,'Lifecycle venue','Requester',$4,now()+interval '3 days',now()+interval '4 days','auto')", [lifecycleVenueBookingId, workspaceId, venueId, `VEN-${lifecycleVenueBookingId}`])
    await fixture("INSERT INTO public.streams (id,workspace_id,youtube_broadcast_id,youtube_stream_id,title,created_by,stream_status,stream_key) VALUES ($1,$2,$3,'provider-stream','YouTube',$4,'ready','keep-key')", [streamId, workspaceId, `youtube-${streamId}`, userId])
    const connectionId = randomUUID()
    await fixture("INSERT INTO public.zoom_connections (id,workspace_id,zoom_user_id,email,display_name,connected_by,token_expires_at) VALUES ($1,$2,'provider-user','test@example.test','Test',$3,now()+interval '1 day')", [connectionId, workspaceId, userId])
    await fixture("INSERT INTO public.zoom_meetings (id,workspace_id,zoom_connection_id,zoom_meeting_id,topic,created_by,password) VALUES ($1,$2,$3,12345,'Zoom',$4,'keep-password')", [meetingId, workspaceId, connectionId, userId])
  })

  afterAll(async () => {
    if (!pool) return
    // No fixture is deleted from a shared database; this suite runs in the disposable
    // cluster created by test/scripts/request-links.integration.sh.
    await pool.end()
  })

  test.each(cases)("$table links, detaches, and preserves lifecycle fields", async ({ table, id, set, get }) => {
    const before = await pool!.query(`SELECT to_jsonb(record) - 'updated_at' - 'request_id' AS data FROM public.${table} record WHERE id=$1`, [id])
    await run(set, { id, requestId })
    expect(await run(get, { id })).toMatchObject({ id, requestId })
    await run(set, { id, requestId: null })
    expect(await run(get, { id })).toMatchObject({ id, requestId: table === "checklists" ? undefined : null })
    const after = await pool!.query(`SELECT to_jsonb(record) - 'updated_at' - 'request_id' AS data FROM public.${table} record WHERE id=$1`, [id])
    expect(after.rows).toEqual(before.rows)
  })

  test.each(cases)("$table rejects foreign and unknown requests", async ({ id, set }) => {
    await expect(run(set, { id, requestId: foreignRequestId })).rejects.toMatchObject({ status: 400 })
    await expect(run(set, { id, requestId: randomUUID() })).rejects.toMatchObject({ status: 400 })
    await expect(run(set, { id: randomUUID(), requestId })).rejects.toMatchObject({ status: 404 })
  })

  test.each(cases)("$table rejects read-only actor mutations", async ({ table, id, set, get }) => {
    await expect(run(set, { id, requestId: null }, viewerId)).rejects.toMatchObject({ status: 404 })
    expect(await run(get, { id }, viewerId)).toMatchObject({ requestId: table === "checklists" ? undefined : null })
  })

  test("venue booking list and lifecycle transitions read request links under the migrated schema", async () => {
    await run(venues.setRequest, { id: lifecycleVenueBookingId, requestId })
    const before = await run(venues.list, null) as Array<{ id: string; requestId: string | null }>
    expect(before.find((booking) => booking.id === lifecycleVenueBookingId)).toMatchObject({ requestId })

    const approved = await run(venues.approve, { id: lifecycleVenueBookingId }) as { status: string; requestId: string | null }
    expect(approved).toMatchObject({ status: "approved", requestId })
    const after = await run(venues.list, null) as Array<{ id: string; status: string; requestId: string | null }>
    expect(after.find((booking) => booking.id === lifecycleVenueBookingId)).toMatchObject({ status: "approved", requestId })
  })

  test("database constraints enforce workspace even with a migration-owner connection", async () => {
    for (const { table, id } of cases) await expect(fixture(`UPDATE public.${table} SET request_id=$2 WHERE id=$1`, [id, foreignRequestId])).rejects.toThrow("request must belong to the same workspace")
  })

  test("a stale checklist content save preserves a link or detach made separately", async () => {
    const independent = await run(checklists.getById, { id: checklistId }) as Checklist
    await run(checklists.setRequest, { id: checklistId, requestId })
    const saved = await run(checklists.save, { checklist: { ...independent, name: "Changed after linking" } }) as Checklist
    expect(saved).toMatchObject({ requestId, name: "Changed after linking", items: [{ checked: true }] })
    await run(checklists.setRequest, { id: checklistId, requestId: null })
    const detached = await run(checklists.save, { checklist: { ...saved, name: "Changed after unlinking" } }) as Checklist
    expect(detached.requestId).toBeUndefined()
    expect(detached.items[0].checked).toBe(true)
  })

  test("stream and meeting creation links atomically, and provider synchronization retains the origin", async () => {
    const linkedStreamId = randomUUID(), linkedMeetingId = randomUUID()
    const streamRecord = { id: linkedStreamId, youtube_broadcast_id: `linked-${linkedStreamId}`, youtube_stream_id: "provider-id", title: "Created from request", privacy_status: "unlisted", request_id: requestId }
    await run(streams.insertStream, { record: streamRecord })
    expect(await run(streams.get, { id: linkedStreamId })).toMatchObject({ requestId })
    await run(streams.upsertStreams, { records: [{ youtube_broadcast_id: streamRecord.youtube_broadcast_id, youtube_stream_id: "provider-id", title: "Updated by provider", privacy_status: "unlisted" }] })
    expect(await run(streams.get, { id: linkedStreamId })).toMatchObject({ requestId, title: "Updated by provider" })

    const meetingRecord = { id: linkedMeetingId, zoom_meeting_id: 24680, topic: "Created from request", request_id: requestId }
    await run(streams.insertZoomMeeting, { record: meetingRecord })
    expect(await run(streams.getZoomMeeting, { id: linkedMeetingId })).toMatchObject({ requestId })
    await run(streams.upsertZoomMeetings, { records: [{ zoom_meeting_id: 24680, topic: "Updated by provider" }] })
    expect(await run(streams.getZoomMeeting, { id: linkedMeetingId })).toMatchObject({ requestId, topic: "Updated by provider" })

    await expect(run(streams.insertStream, { record: { ...streamRecord, id: randomUUID(), request_id: foreignRequestId } })).rejects.toMatchObject({ status: 400 })
    await expect(run(streams.insertZoomMeeting, { record: { ...meetingRecord, id: randomUUID(), request_id: foreignRequestId } })).rejects.toMatchObject({ status: 400 })
  })

  test("a creator with read/create permission can create linked records", async () => {
    const roleId = randomUUID(), linkedId = randomUUID()
    await fixture("INSERT INTO public.roles (id,name,can_read,can_create,can_update,can_delete,can_manage_roles) VALUES ($1,$2,true,true,false,false,false)", [roleId, `creator-${roleId}`])
    await fixture("UPDATE public.workspace_users SET role_id=$3 WHERE workspace_id=$1 AND user_id=$2", [workspaceId, viewerId, roleId])
    await run(streams.insertStream, { record: { id: linkedId, youtube_broadcast_id: `creator-${linkedId}`, youtube_stream_id: "provider-id", title: "Created", privacy_status: "unlisted", request_id: requestId } }, viewerId)
    expect(await run(streams.get, { id: linkedId }, viewerId)).toMatchObject({ requestId })
    const now = new Date().toISOString()
    const linkedChecklistId = randomUUID()
    await run(checklists.save, { checklist: { id: linkedChecklistId, kind: "instance", name: "Created from request", description: "", requestId, scheduledAt: now, createdAt: now, updatedAt: now, items: [], sections: [] } }, viewerId)
    expect(await run(checklists.getById, { id: linkedChecklistId }, viewerId)).toMatchObject({ requestId })
  })

  test("request deletion detaches all records without deleting them", async () => {
    for (const { id, set } of cases) await run(set, { id, requestId })
    await fixture("DELETE FROM public.requests WHERE id=$1", [requestId])
    for (const { table, id, get } of cases) expect(await run(get, { id })).toMatchObject({ id, requestId: table === "checklists" ? undefined : null })
  })
})
