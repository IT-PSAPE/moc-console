import { queryRows, withActor } from '@moc/backend/database'
import type { PoolClient, QueryResultRow } from 'pg'
import type { AttendanceResponse, EditScope, Occurrence, Schedule } from './types.js'

type RpcArguments = Record<string, unknown>

const RPC_SQL: Record<string, (args: RpcArguments) => { sql: string; values: unknown[] }> = {
  materialize_scheduled_messages: (a) => ({ sql: 'SELECT public.materialize_scheduled_messages($1::uuid)', values: [a.p_schedule ?? null] }),
  recover_scheduled_deliveries: () => ({ sql: 'SELECT public.recover_scheduled_deliveries()', values: [] }),
  prepare_scheduled_messages: () => ({ sql: 'SELECT public.prepare_scheduled_messages()', values: [] }),
  change_scheduled_occurrence: (a) => ({ sql: 'SELECT public.change_scheduled_occurrence($1::uuid,$2::uuid,$3::integer,$4::text,$5::text,$6::text)', values: [a.p_actor,a.p_id,a.p_revision,a.p_field,a.p_value,a.p_scope ?? 'occurrence'] }),
  request_scheduled_send: (a) => ({ sql: 'SELECT public.request_scheduled_send($1::uuid,$2::uuid)', values: [a.p_actor,a.p_id] }),
  request_scheduled_resend: (a) => ({ sql: 'SELECT public.request_scheduled_resend($1::uuid,$2::uuid,$3::integer)', values: [a.p_actor,a.p_id,a.p_revision] }),
  delete_scheduled_occurrence: (a) => ({ sql: 'SELECT public.delete_scheduled_occurrence($1::uuid,$2::uuid,$3::integer,$4::text)', values: [a.p_actor,a.p_id,a.p_revision,a.p_scope] }),
  respond_scheduled_attendance: (a) => ({ sql: 'SELECT public.respond_scheduled_attendance($1::uuid,$2::uuid,$3::integer,$4::text,$5::text,$6::text)', values: [a.p_actor,a.p_id,a.p_revision,a.p_status,a.p_arrival,a.p_group] }),
  save_scheduled_template: (a) => ({ sql: 'SELECT public.save_scheduled_template($1::uuid,$2::uuid,$3::jsonb)', values: [a.p_actor,a.p_workspace,JSON.stringify(a.p_data)] }),
  delete_scheduled_template: (a) => ({ sql: 'SELECT public.delete_scheduled_template($1::uuid,$2::uuid,$3::uuid)', values: [a.p_actor,a.p_workspace,a.p_id] }),
  create_scheduled_schedule: (a) => ({ sql: 'SELECT public.create_scheduled_schedule($1::uuid,$2::uuid,$3::jsonb)', values: [a.p_actor,a.p_workspace,JSON.stringify(a.p_data)] }),
  begin_scheduled_delivery: (a) => ({ sql: 'SELECT public.begin_scheduled_delivery($1::uuid) AS result', values: [a.p_delivery] }),
  finish_scheduled_delivery: (a) => ({ sql: 'SELECT public.finish_scheduled_delivery($1::uuid,$2::integer,$3::bigint,$4::text,$5::boolean)', values: [a.p_delivery,a.p_revision,a.p_message,a.p_error,a.p_ambiguous] }),
}

/** Calls only named domain functions. API actor values come from authenticated sessions or Telegram identity lookup. */
export async function scheduledRpc(name: string, args: RpcArguments = {}, client?: PoolClient): Promise<unknown> {
  const build = RPC_SQL[name]
  if (!build) throw new Error(`Unsupported scheduled operation: ${name}`)
  const { sql, values } = build(args)
  const actor = typeof args.p_actor === 'string' ? args.p_actor : null
  const workspace = typeof args.p_workspace === 'string' ? args.p_workspace : null
  const role = actor ? 'moc_app' : 'moc_worker'
  const run = async (connection: PoolClient): Promise<unknown> => {
    const result = await connection.query(sql, values)
    return result.rows[0]?.result ?? result.rows[0]?.[Object.keys(result.rows[0] ?? {})[0] ?? ''] ?? null
  }
  return client ? run(client) : withActor({ userId: actor, workspaceId: workspace, role }, run)
}

export async function getOccurrence(id: string, client?: PoolClient): Promise<Occurrence> {
  const [row] = await queryRows<Occurrence & import('pg').QueryResultRow>('SELECT * FROM public.scheduled_message_occurrences WHERE id=$1', [id], client)
  if (!row) throw new Error('Scheduled occurrence was not found')
  return row
}
export async function getSchedule(id: string, client?: PoolClient): Promise<Schedule> {
  const [row] = await queryRows<Schedule & import('pg').QueryResultRow>('SELECT * FROM public.scheduled_message_schedules WHERE id=$1', [id], client)
  if (!row) throw new Error('Scheduled message was not found')
  return row
}
export async function getResponses(id: string, client?: PoolClient): Promise<AttendanceResponse[]> {
  return queryRows<AttendanceResponse & import('pg').QueryResultRow>('SELECT user_id,name,status,arrival_time,group_id FROM public.scheduled_message_responses WHERE occurrence_id=$1 ORDER BY name', [id], client)
}
export function assertActive(o: Occurrence): void {
  if (Date.parse(o.expires_at) <= Date.now() || ['cancelled','unknown','sending'].includes(o.state)) throw new Error('Message is no longer actionable. Reopen the management flow.')
}
export async function listActive(workspaceId: string, chatId?: string, client?: PoolClient, materialize = true): Promise<Occurrence[]> {
  if (materialize) await scheduledRpc('materialize_scheduled_messages')
  return queryRows<Occurrence & import('pg').QueryResultRow>(
    `SELECT o.* FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s ON s.id=o.schedule_id
     WHERE o.workspace_id=$1 AND s.enabled AND o.expires_at>now() AND o.state<>'cancelled' AND ($2::text IS NULL OR s.group_chat_id=$2)
     ORDER BY o.send_on LIMIT 500`, [workspaceId, chatId ?? null], client,
  )
}
export async function changeOccurrence(actor: string, id: string, revision: number, field: string, value: string, scope: EditScope, client?: PoolClient): Promise<void> {
  await scheduledRpc('change_scheduled_occurrence',{p_actor:actor,p_id:id,p_revision:revision,p_field:field,p_value:value,p_scope:scope},client)
}
export async function sendOccurrence(actor: string,id: string,client?: PoolClient): Promise<void> {
  await scheduledRpc('request_scheduled_send',{p_actor:actor,p_id:id},client)
}
export async function resendOccurrence(actor: string,id: string,revision: number,client?: PoolClient): Promise<void> {
  await scheduledRpc('request_scheduled_resend',{p_actor:actor,p_id:id,p_revision:revision},client)
}
export async function deleteOccurrence(actor: string,id: string,revision: number,scope: EditScope,client?: PoolClient): Promise<string[]> {
  return await scheduledRpc('delete_scheduled_occurrence',{p_actor:actor,p_id:id,p_revision:revision,p_scope:scope},client) as string[]
}
export async function respondAttendance(actor: string,o: Occurrence,status: 'attending'|'not_attending',arrival: string|null,groupId: string|null,client?: PoolClient): Promise<void> {
  await scheduledRpc('respond_scheduled_attendance',{p_actor:actor,p_id:o.id,p_revision:o.revision,p_status:status,p_arrival:arrival,p_group:groupId},client)
}
export async function linkedUser(telegramId: string): Promise<string> {
  const [row] = await queryRows<import('pg').QueryResultRow & { id: string }>('SELECT id FROM public.users WHERE telegram_chat_id=$1', [telegramId])
  if (!row) throw new Error('Link your Telegram account in MOC Console first.')
  return row.id
}
export async function groupWorkspace(chatId: string): Promise<string> {
  const [row] = await queryRows<import('pg').QueryResultRow & { workspace_id: string }>("SELECT workspace_id FROM public.telegram_groups WHERE chat_id=$1 AND active AND removed_at IS NULL", [chatId])
  if (!row) throw new Error('This group is not active in MOC Console.')
  return row.workspace_id
}
export async function authorizeManagement(actor: string,workspaceId: string,client?: PoolClient): Promise<void> {
  const check = async (connection: PoolClient): Promise<boolean> => {
    const result = await connection.query<{ allowed: boolean } & QueryResultRow>(
      'SELECT EXISTS(SELECT 1 FROM public.workspace_users w JOIN public.roles r ON r.id=w.role_id WHERE w.user_id=$1 AND w.workspace_id=$2 AND r.can_update) AS allowed',
      [actor, workspaceId],
    )
    return result.rows[0]?.allowed ?? false
  }
  const allowed = client ? await check(client) : await withActor({ userId: actor, workspaceId, role: 'moc_app' }, check)
  if (!allowed) throw new Error('Not authorised')
}
