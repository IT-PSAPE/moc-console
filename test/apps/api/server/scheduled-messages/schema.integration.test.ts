import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { withActor } from '@moc/backend/database'
import { scheduledSnapshot } from '../../../../../apps/api/server/scheduled-messages/handler.js'
import { checkInAttendance, scheduledRpc } from '../../../../../apps/api/server/scheduled-messages/store.js'

const databaseUrl=process.env.MOC_TEST_DATABASE_URL
const suite=databaseUrl?describe:describe.skip
const pool=databaseUrl?new Pool({connectionString:databaseUrl}):null
const workspaceId=randomUUID()
const actorId=randomUUID()
const attendeeId=randomUUID()
const scheduleId=randomUUID()
const occurrenceIds={scheduled:randomUUID(),sending:randomUUID(),sent:randomUUID(),cancelled:randomUUID(),unknown:randomUUID(),retry:randomUUID()}
const attendanceScheduleId=randomUUID()
const attendanceOccurrenceIds={primary:randomUUID(),followUp:randomUUID()}
const chatId=`scheduled-api-${randomUUID()}`
const timezone='Pacific/Auckland'

type Snapshot=Awaited<ReturnType<typeof scheduledSnapshot>> & {workspaceTimezone:string;occurrences:Array<{id:string;state:string}>}

async function runSnapshot(view:'active'|'history'):Promise<{snapshot:Snapshot;statements:string[]}> {
  if(!pool) throw new Error('MOC_TEST_DATABASE_URL is required')
  return withActor({userId:actorId,workspaceId,role:'moc_app'},async client=>{
    const statements:string[]=[]
    const tracedClient={query:async(text:string,values:readonly unknown[]=[]):Promise<{rows:QueryResultRow[]}>=>{
      statements.push(text)
      return client.query(text,[...values])
    }} as unknown as PoolClient
    const snapshot=await scheduledSnapshot(workspaceId,tracedClient,false,view) as Snapshot
    return {snapshot,statements}
  })
}

suite('scheduled-message API snapshot against the migrated PostgreSQL schema',()=>{
  beforeAll(async()=>{
    if(!pool) return
    process.env.DATABASE_URL=databaseUrl
    await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,$2,$3)',[actorId,'Scheduled API Integration',`${actorId}@example.test`])
    await pool.query('INSERT INTO public.users (id,name,surname,email) VALUES ($1,$2,$3,$4)',[actorId,'Scheduled','Integration',`${actorId}@example.test`])
    await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,$2,$3)',[attendeeId,'Scheduled API Attendee',`${attendeeId}@example.test`])
    await pool.query('INSERT INTO public.users (id,name,surname,email) VALUES ($1,$2,$3,$4)',[attendeeId,'Scheduled','Attendee',`${attendeeId}@example.test`])
    await pool.query('INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)',[workspaceId,`Scheduled API ${workspaceId}`,`scheduled-api-${workspaceId}`])
    const memberType=await pool.query<{id:string}>("SELECT id FROM public.workspace_member_types WHERE workspace_id=$1 AND is_default LIMIT 1",[workspaceId])
    await pool.query(`INSERT INTO public.workspace_users (workspace_id,user_id,role_id,member_type_id)
      SELECT $1,$2,id,$3 FROM public.roles WHERE name='admin'`,[workspaceId,actorId,memberType.rows[0]!.id])
    await pool.query(`INSERT INTO public.workspace_users (workspace_id,user_id,role_id,member_type_id)
      SELECT $1,$2,id,$3 FROM public.roles WHERE name='viewer'`,[workspaceId,attendeeId,memberType.rows[0]!.id])
    await pool.query('INSERT INTO public.notification_settings (workspace_id,timezone) VALUES ($1,$2) ON CONFLICT (workspace_id) DO UPDATE SET timezone=EXCLUDED.timezone',[workspaceId,timezone])
    await pool.query("INSERT INTO public.telegram_groups (chat_id,title,type,active,workspace_id) VALUES ($1,'Scheduled API test','supergroup',true,$2)",[chatId,workspaceId])
    await pool.query(`INSERT INTO public.scheduled_message_schedules
      (id,workspace_id,group_chat_id,starts_on,send_time,frequency,timezone,enabled,body,message_type,attendee_ids,attendance_groups,follow_up_minutes)
      VALUES ($1,$2,$3,current_date,'12:00','daily',$4,true,'API schema smoke','announcement','{}','[]',NULL)`,[scheduleId,workspaceId,chatId,timezone])
    const states:[keyof typeof occurrenceIds,string,number,string|null][]=[
      ['scheduled','scheduled',15,null],
      ['sending','sending',30,null],
      ['sent','sent',-30,null],
      ['cancelled','cancelled',-45,null],
      ['unknown','unknown',-60,null],
      ['retry','scheduled',45,'Retryable delivery error'],
    ]
    for(const [index,[key,state,offset,error]] of states.entries()) {
      await pool.query(`INSERT INTO public.scheduled_message_occurrences
        (id,workspace_id,schedule_id,occurrence_on,send_on,body,message_type,attendee_ids,attendance_groups,state,last_sync_error)
        VALUES ($1,$2,$3,current_date+$4::integer,clock_timestamp()+($5::integer*interval '1 minute'),'API schema smoke','announcement','{}','[]',$6,$7)`,
      [occurrenceIds[key],workspaceId,scheduleId,index,offset,state,error])
    }
    await pool.query(`INSERT INTO public.scheduled_message_schedules
      (id,workspace_id,group_chat_id,starts_on,send_time,frequency,timezone,enabled,body,message_type,attendee_ids,attendance_groups,follow_up_minutes)
      VALUES ($1,$2,$3,current_date,'08:00','once',$4,true,'Attendance race','attendance',ARRAY[$5::uuid],'[]',60)`,
    [attendanceScheduleId,workspaceId,chatId,timezone,attendeeId])
    await pool.query(`INSERT INTO public.scheduled_message_occurrences
      (id,workspace_id,schedule_id,attendee_ids,occurrence_on,send_on,body,message_type,attendance_groups,state,telegram_message_id,post_role,parent_occurrence_id)
      VALUES ($1,$2,$3,ARRAY[$4::uuid],current_date+10,clock_timestamp(),'Attendance race','attendance','[]','sent',7100,'primary',NULL),
             ($5,$2,$3,ARRAY[$4::uuid],current_date+11,clock_timestamp(),'Attendance race','attendance','[]','sent',7101,'follow_up',$1)`,
    [attendanceOccurrenceIds.primary,workspaceId,attendanceScheduleId,attendeeId,attendanceOccurrenceIds.followUp])
    await pool.query(`INSERT INTO public.scheduled_message_responses
      (occurrence_id,user_id,name,status,arrival_time,group_id,decline_reason,checked_in_at)
      VALUES ($1,$2,'Scheduled API Attendee','awaiting',NULL,NULL,NULL,NULL)`,[attendanceOccurrenceIds.primary,attendeeId])
  })

  afterAll(async()=>{
    if(!pool) return
    try {
      await pool.query('ALTER TABLE public.workspace_users DISABLE TRIGGER workspace_users_protect_last_manager')
      try { await pool.query('DELETE FROM public.workspaces WHERE id=$1',[workspaceId]) }
      finally { await pool.query('ALTER TABLE public.workspace_users ENABLE TRIGGER workspace_users_protect_last_manager') }
      await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[actorId,attendeeId]])
      await pool.query('DELETE FROM moc_auth."user" WHERE id=ANY($1::uuid[])',[[actorId,attendeeId]])
    } finally { await pool.end() }
  })

  test('uses the real workspace timezone function and selects the new active and history states',async()=>{
    if(!pool) throw new Error('MOC_TEST_DATABASE_URL is required')
    const expectedTimezone=await pool.query<{workspace_timezone:string}>('SELECT public.workspace_timezone($1::uuid) AS workspace_timezone',[workspaceId])
    const active=await runSnapshot('active')
    const history=await runSnapshot('history')
    const activeIds=active.snapshot.occurrences.map(row=>row.id)
    const historyIds=history.snapshot.occurrences.map(row=>row.id)

    expect(active.snapshot.workspaceTimezone).toBe(expectedTimezone.rows[0]?.workspace_timezone)
    expect(history.snapshot.workspaceTimezone).toBe(expectedTimezone.rows[0]?.workspace_timezone)
    expect(active.snapshot).not.toHaveProperty('templates')
    expect(history.snapshot).not.toHaveProperty('templates')
    expect(activeIds).toEqual(expect.arrayContaining([occurrenceIds.scheduled,occurrenceIds.sending,occurrenceIds.retry]))
    expect(activeIds).not.toEqual(expect.arrayContaining([occurrenceIds.sent,occurrenceIds.cancelled,occurrenceIds.unknown]))
    expect(historyIds).toEqual(expect.arrayContaining([occurrenceIds.sent,occurrenceIds.cancelled,occurrenceIds.unknown,occurrenceIds.retry]))
    expect(historyIds).not.toContain(occurrenceIds.sending)
    expect(active.statements.some(sql=>sql.includes('public.workspace_timezone($1)'))).toBe(true)
    expect([...active.statements,...history.statements].some(sql=>sql.includes('materialize_scheduled_messages'))).toBe(false)
  })

  test('concurrent intent and check-in follow primary-then-child locking and preserve one receipt timestamp',async()=>{
    const checkIn=()=>checkInAttendance(attendeeId,attendanceOccurrenceIds.followUp,workspaceId,chatId,7101)
    const results=await Promise.allSettled([
      checkIn(),
      scheduledRpc('respond_scheduled_attendance',{p_actor:attendeeId,p_id:attendanceOccurrenceIds.primary,p_revision:1,p_status:'attending',p_arrival:'08:00',p_group:null,p_reason:null}),
      checkIn(),
    ])
    const failures=results.filter((result):result is PromiseRejectedResult=>result.status==='rejected')
    expect(failures).toHaveLength(0)
    if(failures[0]) throw failures[0].reason
    const firstResult=results[0]
    const retryResult=results[2]
    if(firstResult?.status!=='fulfilled'||retryResult?.status!=='fulfilled') throw new Error('Concurrent attendance transaction failed')
    const firstCheckIn=firstResult.value
    const retryCheckIn=retryResult.value
    expect(firstCheckIn).not.toBeNull()
    expect(retryCheckIn).toBe(firstCheckIn)
    const response=await pool!.query<{status:string;checked_in_at:string}>('SELECT status,checked_in_at::text AS checked_in_at FROM public.scheduled_message_responses WHERE occurrence_id=$1 AND user_id=$2',[attendanceOccurrenceIds.primary,attendeeId])
    expect(response.rows[0]).toMatchObject({status:'attending'})
    expect(new Date(response.rows[0]!.checked_in_at).toISOString()).toBe(firstCheckIn)
  })
})
