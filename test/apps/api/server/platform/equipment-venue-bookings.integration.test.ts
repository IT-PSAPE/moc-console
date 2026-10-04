import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { withActor } from "@moc/backend/database"
import type { PlatformOperation } from "../../../../../apps/api/server/platform/context"
import { operations as equipmentOperations } from "../../../../../apps/api/server/platform/equipment"
import { operations as bookingOperations } from "../../../../../apps/api/server/platform/bookings"
import { operations as venueOperations } from "../../../../../apps/api/server/platform/venues"
import { operations as venueBookingOperations } from "../../../../../apps/api/server/platform/venue-bookings"
import { operations as publicOperations } from "../../../../../apps/api/server/platform/public"
import { operations as requestOperations } from "../../../../../apps/api/server/platform/requests"
import { operations as checklistOperations } from "../../../../../apps/api/server/platform/checklists"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const userId = randomUUID()
const workspaceId = randomUUID()
const venueId = randomUUID()
const eventId = randomUUID()
const equipmentId = randomUUID()
const bookingId = randomUUID()
const recurringBookingId = randomUUID()
const competingVenueBookingId = randomUUID()

async function runOperation<T>(operation: PlatformOperation, input: unknown): Promise<T> {
  if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
  return withActor({ userId, workspaceId, role: "moc_app" }, async (db) => operation.run({ db, userId, workspaceId }, input) as Promise<T>)
}

async function runPublicOperation<T>(operation: PlatformOperation, input: unknown): Promise<T> {
  if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
  return withActor({ userId: null, workspaceId: null, role: "moc_public" }, async (db) => operation.run({ db, userId: "", workspaceId: "" }, input) as Promise<T>)
}

suite("Task 6 operations against the local Neon PostgreSQL schema", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    await pool.query("INSERT INTO moc_auth.\"user\" (id,name,email) VALUES ($1,'Task 6 Test',$2)", [userId, `task6-${userId}@example.test`])
    await pool.query("INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Task 6','Tester',$2)", [userId, `task6-${userId}@example.test`])
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [workspaceId, `Task 6 ${workspaceId}`, `task-6-${workspaceId}`])
    await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name='admin'", [workspaceId, userId])
    await pool.query("INSERT INTO public.venues (id,workspace_id,name,description) VALUES ($1,$2,'Integration Hall','Live test venue')", [venueId, workspaceId])
    await pool.query("INSERT INTO public.venue_events (id,workspace_id,name,description) VALUES ($1,$2,'Integration Workshop','Live test event')", [eventId, workspaceId])
    await pool.query("INSERT INTO public.equipment (id,workspace_id,name,serial_number,category,location) VALUES ($1,$2,'Integration Camera',$3,'camera','Studio')", [equipmentId, workspaceId, `TASK6-${equipmentId}`])
    await pool.query(`INSERT INTO public.bookings (id,workspace_id,tracking_code,title,booked_by,checked_out_at,expected_return_at,status)
      VALUES ($1,$2,$3,'Batch equipment booking','Requester',now() - interval '1 hour',now() + interval '1 day','booked')`, [bookingId, workspaceId, `TASK6-${bookingId}`])
    await pool.query("INSERT INTO public.booking_items (booking_id,equipment_id) VALUES ($1,$2)", [bookingId, equipmentId])

    const start = new Date(Date.now() + 86_400_000).toISOString()
    const end = new Date(Date.now() + 86_400_000 + 3_600_000).toISOString()
    await pool.query(`INSERT INTO public.venue_bookings
      (id,workspace_id,venue_id,event_id,tracking_code,title,requested_by,status,starts_at,ends_at,recurrence,cancelled_at)
      VALUES ($1,$2,$3,$4,$5,'Recurring workshop','Requester','cancelled',$6,$7,
        '{"custom":false,"frequency":"week","interval":1,"weekdays":[2],"end":{"type":"count","count":2}}'::jsonb,now())`,
    [recurringBookingId, workspaceId, venueId, eventId, `TASK6-${recurringBookingId}`, start, end])
    await pool.query(`INSERT INTO public.venue_booking_slots (venue_booking_id,venue_id,occurrence_index,slot_start,slot_end,active)
      VALUES ($1,$2,0,$3,$4,false)`, [recurringBookingId, venueId, start, end])
    await pool.query(`INSERT INTO public.venue_bookings
      (id,workspace_id,venue_id,event_id,tracking_code,title,requested_by,status,starts_at,ends_at)
      VALUES ($1,$2,$3,$4,$5,'Competing workshop','Requester','auto',$6,$7)`,
    [competingVenueBookingId, workspaceId, venueId, eventId, `TASK6-${competingVenueBookingId}`, start, end])
    await pool.query(`INSERT INTO public.venue_booking_slots (venue_booking_id,venue_id,occurrence_index,slot_start,slot_end)
      VALUES ($1,$2,0,$3,$4)`, [competingVenueBookingId, venueId, start, end])
  })

  afterAll(async () => {
    if (!pool) return
    await pool.query("ALTER TABLE public.workspace_users DISABLE TRIGGER workspace_users_protect_last_manager")
    try {
      await pool.query("DELETE FROM public.workspaces WHERE id=$1", [workspaceId])
    } finally {
      await pool.query("ALTER TABLE public.workspace_users ENABLE TRIGGER workspace_users_protect_last_manager")
    }
    await pool.query("DELETE FROM moc_auth.\"user\" WHERE id=$1", [userId])
    await pool.end()
  })

  test("equipment list and booking status updates preserve trigger-derived inventory status", async () => {
    const equipment = await runOperation<Array<{ id: string; status: string; bookedBy: string | null }>>(equipmentOperations.list, null)
    expect(equipment.find((item) => item.id === equipmentId)).toMatchObject({ status: "booked", bookedBy: "Requester" })

    await runOperation(bookingOperations.updateStatus, { id: bookingId, status: "checked_out" })
    const checkedOut = await pool!.query("SELECT status FROM public.equipment WHERE id=$1", [equipmentId])
    expect(checkedOut.rows[0].status).toBe("booked_out")

    await runOperation(bookingOperations.updateStatus, { id: bookingId, status: "archived" })
    const archived = await pool!.query("SELECT status FROM public.equipment WHERE id=$1", [equipmentId])
    expect(archived.rows[0].status).toBe("available")
  })

  test("venue and event operations return domain models and respect booking foreign keys", async () => {
    const venues = await runOperation<Array<{ id: string; description: string | null }>>(venueOperations.list, null)
    const events = await runOperation<Array<{ id: string; description: string | null }>>(venueOperations.listEvents, null)
    expect(venues.find((venue) => venue.id === venueId)?.description).toBe("Live test venue")
    expect(events.find((event) => event.id === eventId)?.description).toBe("Live test event")
  })

  test("recurring venue restore loses atomically when another booking owns its slot", async () => {
    await expect(runOperation(venueBookingOperations.restore, { id: recurringBookingId })).rejects.toMatchObject({ status: 409, code: "conflict" })
    const states = await pool!.query(`SELECT b.status, s.active FROM public.venue_bookings b
      JOIN public.venue_booking_slots s ON s.venue_booking_id=b.id WHERE b.id=$1`, [recurringBookingId])
    expect(states.rows).toEqual([{ status: "cancelled", active: false }])
    const listing = await runOperation<Array<{ id: string; recurrence: { frequency: string }; occurrences: unknown[] }>>(venueBookingOperations.list, null)
    const restored = listing.find((booking) => booking.id === recurringBookingId)
    expect(restored?.recurrence.frequency).toBe("week")
    expect(restored?.occurrences).toHaveLength(1)
  })

  test("operation SQL cannot read another workspace by supplying its id", async () => {
    const foreignWorkspaceId = randomUUID()
    await pool!.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [foreignWorkspaceId, `Foreign ${foreignWorkspaceId}`, `foreign-${foreignWorkspaceId}`])
    const foreignVenueId = randomUUID()
    await pool!.query("INSERT INTO public.venues (id,workspace_id,name) VALUES ($1,$2,'Foreign venue')", [foreignVenueId, foreignWorkspaceId])
    const visible = await runOperation<Array<{ id: string }>>(venueOperations.list, { workspaceId: foreignWorkspaceId })
    expect(visible.some((venue) => venue.id === foreignVenueId)).toBe(false)
    await pool!.query("DELETE FROM public.workspaces WHERE id=$1", [foreignWorkspaceId])
  })

  test("public batch booking creation rolls back all rows when one equipment item is invalid", async () => {
    const title = `Atomic batch ${randomUUID()}`
    const data = {
      title,
      equipmentIds: [equipmentId, randomUUID()],
      bookedBy: "Batch requester",
      checkedOutAt: new Date(Date.now() + 3_600_000).toISOString(),
      expectedReturnAt: new Date(Date.now() + 86_400_000).toISOString(),
      notes: "Atomic insert test",
      requestedEquipment: [" tripod ", "camera", "camera"],
      otherEquipment: null,
    }
    const input = { workspaceId, data }

    await expect(runPublicOperation(publicOperations.submitBooking, input)).rejects.toThrow("Booking equipment must belong to the booking workspace")
    const afterFailure = await pool!.query("SELECT id FROM public.bookings WHERE title=$1", [title])
    expect(afterFailure.rows).toHaveLength(0)

    const result = await runPublicOperation<{ bookingId: string; trackingCode: string; title: string }>(publicOperations.submitBooking, {
      ...input,
      data: { ...data, equipmentIds: [equipmentId] },
    })
    const persisted = await pool!.query("SELECT status, requested_equipment, other_equipment FROM public.bookings WHERE id=$1", [result.bookingId])
    const items = await pool!.query("SELECT equipment_id FROM public.booking_items WHERE booking_id=$1", [result.bookingId])
    expect(result).toMatchObject({ title, trackingCode: expect.stringMatching(/^BKG-/) })
    expect(persisted.rows[0]).toMatchObject({ status: "booked", requested_equipment: ["camera", "tripod"], other_equipment: null })
    expect(items.rows).toEqual([{ equipment_id: equipmentId }])
  })

  test("request save returns its category under the verified app actor", async () => {
    const now = new Date().toISOString()
    const requestId = randomUUID()
    const request = {
      id: requestId,
      title: "Integration request",
      priority: "medium",
      status: "not_started",
      category: "event",
      categoryName: "Event",
      createdAt: now,
      updatedAt: now,
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
      requestedBy: "Task 6 Tester",
      who: "Production team",
      what: "Venue preparation",
      when: "Tomorrow",
      where: "Integration Hall",
      why: "Integration test",
      how: "Run test",
      notes: "Request operation test",
      flow: undefined,
      content: undefined,
    }
    const savedRequest = await runOperation<{ id: string; categoryName: string }>(requestOperations.save, { request })
    expect(savedRequest).toMatchObject({ id: requestId, categoryName: "Event" })
  })

  test("checklist save applies nested structure through the database RPC", async () => {
    const now = new Date().toISOString()
    const checklistId = randomUUID()
    const itemId = randomUUID()
    const sectionId = randomUUID()
    const checklist = {
      id: checklistId,
      kind: "instance",
      name: "Integration checklist",
      description: "Persisted structure",
      scheduledAt: now,
      requestId: undefined,
      items: [{ id: randomUUID(), label: "Confirm details", checked: false }],
      sections: [{ id: sectionId, name: "Preparation", items: [{ id: itemId, label: "Book venue", checked: true }] }],
      createdAt: now,
      updatedAt: now,
    }
    const savedChecklist = await runOperation<{ id: string; requestId?: string; sections: Array<{ id: string; items: Array<{ id: string; checked: boolean }> }> }>(checklistOperations.save, { checklist })
    expect(savedChecklist).toMatchObject({ id: checklistId, sections: [{ id: sectionId, items: [{ id: itemId, checked: true }] }] })
  })
})
