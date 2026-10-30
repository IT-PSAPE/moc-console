import { expect, test, vi } from 'vitest'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context'
import { operations as quotes } from '../../../../../apps/api/server/platform/daily-quotes'
import { operations as overview } from '../../../../../apps/api/server/platform/overview'

const quoteId = '10000000-0000-4000-8000-000000000001'
const row = { id: quoteId, text: 'Keep going.', attribution: null, active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }

function context(query: ReturnType<typeof vi.fn>): PlatformContext {
  return { db: { query } as unknown as PlatformContext['db'], userId: 'verified-user', workspaceId: 'verified-workspace' }
}

test('quote management requires admin permission while the daily quote is readable', () => {
  expect(quotes.list.permission).toBe('can_manage_roles')
  expect(quotes.save.permission).toBe('can_manage_roles')
  expect(quotes.setActive.permission).toBe('can_manage_roles')
  expect(quotes.setToday.permission).toBe('can_manage_roles')
  expect(quotes.getDaily.permission).toBe('can_read')
})

test('daily quote selection derives a stable local day on the server and handles an empty library', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [{ quote: null, date: '2026-10-29', timezone: 'Africa/Harare', overridden: false }] })
  expect(await quotes.getDaily.run(context(query), null)).toEqual({ quote: null, date: '2026-10-29', timezone: 'Africa/Harare', overridden: false })
  expect(query).toHaveBeenCalledWith(expect.stringContaining('CURRENT_TIMESTAMP AT TIME ZONE public.workspace_timezone($1)'), ['verified-workspace'])
  expect(query.mock.calls[0][0]).toContain('WHERE workspace_id = $1 AND active')
  await expect(quotes.getDaily.run(context(query), { workspaceId: 'forged' })).rejects.toMatchObject({ status: 400 })
})

test('saves trimmed quotes in the verified workspace and does not silently reactivate an edited quote', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [row] })
  const saved = await quotes.save.run(context(query), { id: quoteId, text: ' Keep going. ', attribution: '  ' })
  expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE workspace_id = $1 AND id = $2'), ['verified-workspace', quoteId, 'Keep going.', null, null])
  expect(query.mock.calls[0][0]).toContain('active = coalesce($5, active)')
  expect(saved).toEqual({ id: quoteId, text: row.text, attribution: null, active: true, createdAt: row.created_at, updatedAt: row.updated_at })
})

test.each([{ text: '' }, { text: ' '.repeat(3) }, { text: 'x'.repeat(1001) }, { text: 'Fine', attribution: 'x'.repeat(201) }, { text: 'Fine', active: 'yes' }, { text: 'Fine', active: null }, { text: 'Fine', workspaceId: 'forged' }])('rejects invalid quotes before database work', async input => {
  const query = vi.fn()
  await expect(quotes.save.run(context(query), input)).rejects.toMatchObject({ status: 400 })
  expect(query).not.toHaveBeenCalled()
})

test('deactivation is scoped to the verified workspace and missing records stay missing', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [] })
  await expect(quotes.setActive.run(context(query), { id: quoteId, active: false })).rejects.toMatchObject({ status: 404 })
  expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE workspace_id = $1 AND id = $2'), ['verified-workspace', quoteId, false])
})

test('today overrides derive the date and workspace on the server and reject unavailable quotes', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
  await expect(quotes.setToday.run(context(query), { id: quoteId })).rejects.toMatchObject({ status: 400 })
  expect(query).toHaveBeenCalledWith(expect.stringContaining('CURRENT_TIMESTAMP AT TIME ZONE public.workspace_timezone($1)'), ['verified-workspace', quoteId])
  expect(query.mock.calls[0][0]).toContain('WHERE workspace_id = $1 AND id = $2 AND active')
  await expect(quotes.setToday.run(context(query), { id: quoteId, date: '2030-01-01' })).rejects.toMatchObject({ status: 400 })
})

test('clearing today restores automatic rotation without deleting records', async () => {
  const selection = { quote: row, date: '2026-10-29', timezone: 'Africa/Harare', overridden: false }
  const query = vi.fn().mockResolvedValueOnce({ rows: [{}], rowCount: 1 }).mockResolvedValueOnce({ rows: [selection] })
  expect(await quotes.setToday.run(context(query), { id: null })).toMatchObject({ overridden: false, quote: { id: quoteId } })
  expect(query.mock.calls[0][1]).toEqual(['verified-workspace', null])
  expect(query.mock.calls[0][0]).not.toContain('DELETE')
})

test.each([{ role: null, title: 'Team briefing' }, { role: 'primary', title: 'Team briefing' }, { role: 'follow_up', title: 'Team briefing · Follow-up' }])('Overview preserves message management access and returns a compact summary for $role posts', async ({ role, title }) => {
  const query = vi.fn().mockResolvedValue({ rows: [{ id: quoteId, body: '<b>Team briefing</b>\nPrivate instructions', send_on: '2026-11-01T10:00:00Z', state: 'scheduled', post_role: role }] })
  expect(overview.scheduledMessages.permission).toBe('can_update')
  expect(await overview.scheduledMessages.run(context(query), null)).toEqual([{ id: quoteId, title, scheduledFor: '2026-11-01T10:00:00Z', status: 'scheduled' }])
  const [sql, values] = query.mock.calls[0]
  expect(sql).toContain('o.workspace_id = $1 AND s.enabled')
  expect(sql).toContain('o.send_on >= CURRENT_TIMESTAMP')
  expect(sql).not.toContain('materialize')
  expect(values).toEqual(['verified-workspace'])
})
