import { getChecklistCounts } from "@/features/checklists/checklist-helpers"
import { moc } from "@/lib/moc-client"
import { routes } from "@/screens/console-routes"
import { invalidateWorkspaceResource, updateWorkspaceResourceData } from "./workspace-resource-cache"

export type RequestLinkedKind = "checklist" | "booking" | "venue-booking" | "stream" | "meeting"
export type RequestLinkedRecord = {
  id: string
  key: string
  kind: RequestLinkedKind
  label: string
  detail: string
  href: string
  requestId: string | null
}
export type RequestLinkOption = { id: string; label: string }

export async function fetchRequestLinkOptions(workspaceId: string): Promise<RequestLinkOption[]> {
  const [requests, archived] = await Promise.all([moc.requests.list(workspaceId), moc.requests.listArchived(workspaceId)])
  return [...requests, ...archived].map((request) => ({ id: request.id, label: `${request.title} · ${request.id.slice(0, 8)}` }))
}

export async function fetchRequestLinkedRecords(workspaceId: string): Promise<RequestLinkedRecord[]> {
  const [bookings, venues, streams, meetings, checklists] = await Promise.all([
    moc.bookings.list(workspaceId), moc.venueBookings.list(workspaceId),
    moc.streams.listStreams(workspaceId), moc.streams.listZoomMeetings(workspaceId), moc.checklists.list(workspaceId),
  ])
  return [
    ...checklists.filter((record) => record.kind === "instance").map((record) => {
      const counts = getChecklistCounts(record)
      return { id: record.id, key: `checklist:${record.id}`, kind: "checklist" as const, label: record.name, detail: `Checklist · ${counts.checked} of ${counts.total} complete`, href: `/${routes.checklists}/${record.id}`, requestId: record.requestId ?? null }
    }),
    ...bookings.map((record) => ({ id: record.id, key: `booking:${record.id}`, kind: "booking" as const, label: record.title, detail: `Equipment · ${record.trackingCode}`, href: `/${routes.bookings}/${record.id}`, requestId: record.requestId ?? null })),
    ...venues.map((record) => ({ id: record.id, key: `venue-booking:${record.id}`, kind: "venue-booking" as const, label: record.title, detail: `Venue · ${record.venueName} · ${record.trackingCode}`, href: `/${routes.venues}/${record.id}`, requestId: record.requestId ?? null })),
    ...streams.map((record) => ({ id: record.id, key: `stream:${record.id}`, kind: "stream" as const, label: record.title, detail: "YouTube stream", href: `/${routes.streams}/stream/${record.id}`, requestId: record.requestId ?? null })),
    ...meetings.map((record) => ({ id: record.id, key: `meeting:${record.id}`, kind: "meeting" as const, label: record.topic, detail: `Zoom · ${record.zoomMeetingId}`, href: `/${routes.streams}/meeting/${record.id}`, requestId: record.requestId ?? null })),
  ]
}

export async function setRecordRequest(kind: RequestLinkedKind, id: string, requestId: string | null, workspaceId: string): Promise<void> {
  switch (kind) {
    case "checklist": await moc.checklists.setRequest(id, requestId, workspaceId); break
    case "booking": await moc.bookings.setRequest(id, requestId, workspaceId); break
    case "venue-booking": await moc.venueBookings.setRequest(id, requestId, workspaceId); break
    case "stream": await moc.streams.setStreamRequest(id, requestId, workspaceId); break
    case "meeting": await moc.streams.setMeetingRequest(id, requestId, workspaceId); break
  }
  const resource = { checklist: "checklists", booking: "bookings", "venue-booking": "venue-bookings", stream: "streams", meeting: "zoom-meetings" }[kind]
  type LinkedSummary = { id: string; requestId?: string | null }
  function updateRecord(record: LinkedSummary): LinkedSummary {
    return record.id === id ? { ...record, requestId: kind === "checklist" ? requestId ?? undefined : requestId } : record
  }
  updateWorkspaceResourceData<LinkedSummary[]>(workspaceId, resource, (current) => current?.map(updateRecord))
  invalidateWorkspaceResource(workspaceId, "request-linked-records")
}

export async function fetchRecordRequest(kind: RequestLinkedKind, id: string, workspaceId: string): Promise<string | null> {
  let record: { requestId?: string | null } | null | undefined
  switch (kind) {
    case "checklist": record = await moc.checklists.getById(id, workspaceId); break
    case "booking": record = await moc.bookings.getById(id, workspaceId); break
    case "venue-booking": record = await moc.venueBookings.getById(id, workspaceId); break
    case "stream": record = await moc.streams.getStream(id, workspaceId); break
    case "meeting": record = await moc.streams.getZoomMeeting(id, workspaceId); break
  }
  if (!record) throw new Error("Record not found")
  return record.requestId ?? null
}
