import { describe, expect, test, vi } from 'vitest'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context'
import { operations } from '../../../../../apps/api/server/platform/users'

function makeContext(query: ReturnType<typeof vi.fn>): PlatformContext {
  return { db: { query } as unknown as PlatformContext['db'], userId: 'signed-in-user', workspaceId: 'workspace' }
}

describe('personal work preferences', () => {
  test('reads the signed-in account independently of workspace permissions', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ default_calendar_view: 'week', overview_item_kinds: ['request', 'venue'] }] })
    expect(await operations.getPreferences.run(makeContext(query), null)).toEqual({ defaultCalendarView: 'week', overviewItemKinds: ['request', 'venue'] })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['signed-in-user'])
    expect(operations.getPreferences.permission).toBe('authenticated')
  })

  test.each(['day', 'week', 'month', 'agenda'])('saves %s for the signed-in account', async view => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 })
    await operations.updatePreferences.run(makeContext(query), { defaultCalendarView: view })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['signed-in-user', view])
    expect(operations.updatePreferences.permission).toBe('authenticated')
  })

  test.each([{ defaultCalendarView: 'unknown' }, { defaultCalendarView: null }, { defaultCalendarView: 'day', userId: 'other-user' }])('rejects invalid preferences without writing', async input => {
    const query = vi.fn()
    await expect(operations.updatePreferences.run(makeContext(query), input)).rejects.toMatchObject({ status: 400 })
    expect(query).not.toHaveBeenCalled()
  })

  test('patches overview choices without resetting the calendar preference', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 })
    await operations.updatePreferences.run(makeContext(query), { overviewItemKinds: ['request', 'equipment'] })
    const [sql, values] = query.mock.calls[0]
    expect(sql).toContain('overview_item_kinds = $2::text[]')
    expect(sql).not.toContain('default_calendar_view')
    expect(values).toEqual(['signed-in-user', ['request', 'equipment']])
  })

  test('can intentionally hide all Overview kinds and update both settings together', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 })
    await operations.updatePreferences.run(makeContext(query), { defaultCalendarView: 'month', overviewItemKinds: [] })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('overview_item_kinds = $3::text[]'), ['signed-in-user', 'month', []])
  })

  test.each([{}, { overviewItemKinds: null }, { overviewItemKinds: ['request', 'request'] }, { overviewItemKinds: ['unknown'] }, { overviewItemKinds: [1] }, { overviewItemKinds: 'request' }])('rejects invalid Overview preferences before writing', async input => {
    const query = vi.fn()
    await expect(operations.updatePreferences.run(makeContext(query), input)).rejects.toMatchObject({ status: 400 })
    expect(query).not.toHaveBeenCalled()
  })
})
