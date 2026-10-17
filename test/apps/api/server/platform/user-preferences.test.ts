import { describe, expect, test, vi } from 'vitest'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context'
import { operations } from '../../../../../apps/api/server/platform/users'

function makeContext(query: ReturnType<typeof vi.fn>): PlatformContext {
  return { db: { query } as unknown as PlatformContext['db'], userId: 'signed-in-user', workspaceId: 'workspace' }
}

describe('personal calendar preferences', () => {
  test('reads the signed-in account independently of workspace permissions', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ default_calendar_view: 'week' }] })
    expect(await operations.getPreferences.run(makeContext(query), null)).toEqual({ defaultCalendarView: 'week' })
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
})
