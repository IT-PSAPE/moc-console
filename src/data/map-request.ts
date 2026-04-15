import type { Request, Priority, Status, Category } from "@/types/requests";

/** Convert a snake_case Supabase row to a camelCase Request */
export function mapRow(row: Record<string, unknown>): Request {
  return {
    id: row.id as string,
    title: row.title as string,
    priority: row.priority as Priority,
    status: row.status as Status,
    category: row.category as Category,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | undefined) ?? (row.created_at as string),
    dueDate: row.due_date as string,
    requestedBy: (row.requested_by as string | undefined) ?? "",
    who: row.who as string,
    what: row.what as string,
    when: row.when_text as string,
    where: row.where_text as string,
    why: row.why as string,
    how: row.how as string,
    notes: (row.notes as string) ?? undefined,
    flow: (row.flow as string) ?? undefined,
    content: (row.content as string) ?? undefined,
  };
}

/** Convert a camelCase Request to a snake_case row for Supabase writes */
export function toRow(request: Request): Record<string, unknown> {
  return {
    id: request.id,
    title: request.title,
    priority: request.priority,
    status: request.status,
    category: request.category,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    due_date: request.dueDate,
    requested_by: request.requestedBy,
    who: request.who,
    what: request.what,
    when_text: request.when,
    where_text: request.where,
    why: request.why,
    how: request.how,
    notes: request.notes ?? null,
    flow: request.flow ?? null,
    content: request.content ?? null,
  };
}
