import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { withActor } from '@moc/backend/database'
import { operations as quotes } from '../../../../../apps/api/server/platform/daily-quotes'
import { operations as overview } from '../../../../../apps/api/server/platform/overview'
import { operations as users } from '../../../../../apps/api/server/platform/users'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context'
import type { DailyQuoteSelection } from '../../../../../packages/sdk/src/daily-quotes'

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const databaseTarget = databaseUrl ? new URL(databaseUrl) : null
const databaseHost = databaseTarget?.searchParams.get('host') ?? databaseTarget?.hostname ?? ''
const localDatabase = databaseHost.startsWith('/') || ['localhost', '127.0.0.1', '[::1]'].includes(databaseHost)
const suite = databaseUrl && localDatabase ? describe : describe.skip
const pool = databaseUrl && localDatabase ? new Pool({ connectionString: databaseUrl }) : null
const workspace = randomUUID()
const otherWorkspace = randomUUID()
const admin = randomUUID()
const editor = randomUUID()
const viewer = randomUUID()
const activeQuote = randomUUID()
const inactiveQuote = randomUUID()
const otherQuote = randomUUID()
const futureMessage = randomUUID()

async function run<T>(userId: string, work: (context: PlatformContext) => Promise<T>): Promise<T> {
  process.env.DATABASE_URL = databaseUrl
  return withActor({ role: 'moc_app', userId, workspaceId: workspace }, async db => work({ db, userId, workspaceId: workspace }))
}

suite('Overview schema, role boundaries and preference persistence', () => {
  beforeAll(async () => {
    if (!pool) return
    for (const [id, name] of [[admin, 'admin'], [editor, 'editor'], [viewer, 'viewer']]) {
      await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,$2,$3)', [id, name, `${id}@example.test`])
      await pool.query('INSERT INTO public.users (id,name,surname,email) VALUES ($1,$2,\'Overview\',$3)', [id, name, `${id}@example.test`])
    }
    for (const id of [workspace, otherWorkspace]) await pool.query('INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)', [id, `Overview ${id}`, `overview-${id}`])
    for (const [id, role] of [[admin, 'admin'], [editor, 'editor'], [viewer, 'viewer']]) {
      await pool.query('INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name=$3', [workspace, id, role])
    }
    await pool.query('INSERT INTO public.notification_settings (workspace_id,timezone) VALUES ($1,\'Pacific/Auckland\') ON CONFLICT (workspace_id) DO UPDATE SET timezone=EXCLUDED.timezone', [workspace])
    await pool.query(`INSERT INTO public.daily_quotes (id,workspace_id,text,active,created_at) VALUES
      ($1,$2,'First active quote',true,'2026-01-01'),($3,$2,'Inactive quote',false,'2026-01-02'),($4,$5,'Other workspace quote',true,'2026-01-01'),($6,$2,'Second active quote',true,'2026-01-03')`, [activeQuote, workspace, inactiveQuote, otherQuote, otherWorkspace, randomUUID()])
    const group = `overview-${randomUUID()}`
    const schedule = randomUUID()
    const columns = await pool.query<{ legacy: boolean }>(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_message_schedules' AND column_name='fields') AS legacy`)
    const legacy = columns.rows[0].legacy
    await pool.query('INSERT INTO public.telegram_groups (chat_id,title,type,active,workspace_id) VALUES ($1,\'Overview group\',\'supergroup\',true,$2)', [group, workspace])
    await pool.query(`INSERT INTO public.scheduled_message_schedules (id,workspace_id,group_chat_id,starts_on,send_time,frequency,timezone,enabled,body,message_type,attendee_ids,attendance_groups${legacy ? ',fields,audience,require_arrival' : ''})
      VALUES ($1,$2,$3,current_date,'12:00','daily','UTC',true,'<b>Team briefing</b>','announcement','{}','[]'${legacy ? ",'{}','{}',false" : ''})`, [schedule, workspace, group])
    for (const [id, minutes, state] of [[futureMessage, 10, 'scheduled'], [randomUUID(), -10, 'scheduled'], [randomUUID(), 20, 'sent']]) {
      await pool.query(`INSERT INTO public.scheduled_message_occurrences (id,workspace_id,schedule_id,occurrence_on,send_on,body,message_type,state,attendee_ids,attendance_groups${legacy ? ',fields,audience,require_arrival,expires_at' : ''})
        VALUES ($1,$2,$3,current_date + $4::integer,now() + make_interval(mins=>$4::integer),'<b>Team briefing</b>\nPrivate details','announcement',$5,'{}','[]'${legacy ? ",'{}','{}',false,now() + interval '3 days'" : ''})`, [id, workspace, schedule, minutes, state])
    }
  })
  afterAll(async () => { await pool?.end() })

  test('daily rotation uses the workspace date and ignores inactive/other-workspace quotes', async () => {
    const first = await run(viewer, context => quotes.getDaily.run(context, null))
    const second = await run(viewer, context => quotes.getDaily.run(context, null))
    const expected = await pool!.query<{ text: string }>(`SELECT CASE WHEN mod((now() AT TIME ZONE 'Pacific/Auckland')::date - DATE '2020-01-01',2)=0 THEN 'First active quote' ELSE 'Second active quote' END AS text`)
    expect(first).toEqual(second)
    expect(first).toMatchObject({ quote: { text: expected.rows[0].text, active: true }, timezone: 'Pacific/Auckland' })
  })

  test('only admins manage quotes and editing an inactive quote preserves its status', async () => {
    await run(admin, context => quotes.save.run(context, { id: inactiveQuote, text: 'Edited but still inactive' }))
    const list = await run(admin, context => quotes.list.run(context, null)) as Array<{ id: string; active: boolean }>
    expect(list.find(quote => quote.id === inactiveQuote)?.active).toBe(false)
    await run(admin, context => quotes.setActive.run(context, { id: inactiveQuote, active: true }))
    await run(admin, context => quotes.setActive.run(context, { id: inactiveQuote, active: false }))
    await expect(run(editor, context => quotes.save.run(context, { text: 'Editor quote' }))).rejects.toMatchObject({ code: '42501' })
    await expect(run(viewer, context => quotes.save.run(context, { text: 'Viewer quote' }))).rejects.toMatchObject({ code: '42501' })
  })

  test('an admin override is shared with viewers and clearing it restores the automatic selection', async () => {
    const automatic = await run(viewer, context => quotes.getDaily.run(context, null)) as DailyQuoteSelection
    const chosen = await run(admin, context => quotes.setToday.run(context, { id: activeQuote })) as DailyQuoteSelection
    expect(chosen).toMatchObject({ quote: { id: activeQuote }, overridden: true })
    expect(await run(viewer, context => quotes.getDaily.run(context, null))).toEqual(chosen)
    expect(await run(admin, context => quotes.setToday.run(context, { id: null }))).toEqual(automatic)
  })

  test('override writes reject editor/viewer access, inactive quotes and other workspaces', async () => {
    await expect(run(editor, context => quotes.setToday.run(context, { id: activeQuote }))).rejects.toMatchObject({ code: '42501' })
    await expect(run(viewer, context => quotes.setToday.run(context, { id: activeQuote }))).rejects.toMatchObject({ code: '42501' })
    await expect(run(admin, context => quotes.setToday.run(context, { id: inactiveQuote }))).rejects.toMatchObject({ status: 400 })
    await expect(run(admin, context => quotes.setToday.run(context, { id: otherQuote }))).rejects.toMatchObject({ status: 400 })
    await expect(run(admin, context => context.db.query(`INSERT INTO public.daily_quote_overrides (workspace_id,quote_date,quote_id)
      VALUES ($1,(now() AT TIME ZONE public.workspace_timezone($1))::date,$2)
      ON CONFLICT (workspace_id,quote_date) DO UPDATE SET quote_id=EXCLUDED.quote_id`, [workspace, otherQuote]))).rejects.toMatchObject({ code: '42501' })
  })

  test('old-day overrides expire automatically and deactivating today\'s quote falls back to rotation', async () => {
    await run(admin, context => quotes.setToday.run(context, { id: activeQuote }))
    await pool!.query(`UPDATE public.daily_quote_overrides SET quote_date=quote_date-1 WHERE workspace_id=$1`, [workspace])
    expect(await run(viewer, context => quotes.getDaily.run(context, null))).toMatchObject({ overridden: false })
    await run(admin, context => quotes.setToday.run(context, { id: activeQuote }))
    await run(admin, context => quotes.setActive.run(context, { id: activeQuote, active: false }))
    const fallback = await run(viewer, context => quotes.getDaily.run(context, null)) as DailyQuoteSelection
    expect(fallback.overridden).toBe(false)
    expect(fallback.quote?.id).not.toBe(activeQuote)
    await run(admin, context => quotes.setActive.run(context, { id: activeQuote, active: true }))
    await run(admin, context => quotes.setToday.run(context, { id: null }))
  })

  test('policies hide inactive/other-workspace quotes and do not permit irreversible deletion', async () => {
    const visible = await run(viewer, context => context.db.query<{ id: string }>('SELECT id FROM public.daily_quotes'))
    expect(visible.rows).toHaveLength(2)
    expect(visible.rows.map(quote => quote.id)).not.toContain(inactiveQuote)
    await expect(run(admin, context => context.db.query('DELETE FROM public.daily_quotes WHERE id=$1', [activeQuote]))).rejects.toMatchObject({ code: '42501' })
  })

  test('preference patches preserve the other preference and remain isolated to the signed-in user', async () => {
    await run(viewer, context => users.updatePreferences.run(context, { overviewItemKinds: ['request', 'equipment'] }))
    await run(viewer, context => users.updatePreferences.run(context, { defaultCalendarView: 'month' }))
    expect(await run(viewer, context => users.getPreferences.run(context, null))).toEqual({ defaultCalendarView: 'month', overviewItemKinds: ['request', 'equipment'] })
    expect(await run(editor, context => users.getPreferences.run(context, null))).toEqual({ defaultCalendarView: 'week', overviewItemKinds: ['request', 'equipment', 'venue', 'stream', 'message'] })
  })

  test('upcoming message summary excludes past/sent rows without returning body/audience data', async () => {
    const result = await run(editor, context => overview.scheduledMessages.run(context, null)) as Array<Record<string, unknown>>
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: futureMessage, title: 'Team briefing', status: 'scheduled' })
    expect(Object.keys(result[0]).sort()).toEqual(['id', 'scheduledFor', 'status', 'title'])
    expect(await run(viewer, context => overview.scheduledMessages.run(context, null))).toEqual([])
  })
})
