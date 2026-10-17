import { beforeEach, expect, test, vi } from 'vitest'
import type { TelegramGroup } from '@moc/sdk/notification-settings'
import { fetchTelegramGroups, setTelegramGroupActive } from '../../../../../apps/console/src/data/fetch-telegram-groups'

const { telegramGroups, setActive } = vi.hoisted(() => ({
  telegramGroups: vi.fn<(workspaceId: string) => Promise<TelegramGroup[]>>(),
  setActive: vi.fn<(...args: unknown[]) => Promise<void>>(),
}))

vi.mock('../../../../../apps/console/src/lib/moc-client', () => ({
  moc: { notificationSettings: { telegramGroups, setTelegramGroupActive: setActive } },
}))

function group(overrides: Partial<TelegramGroup> = {}): TelegramGroup {
  return { chatId: '-100123', title: 'Service group', type: 'supergroup', isForum: true,
    active: true, workspaceId: 'workspace', addedAt: '2026-10-17T00:00:00Z', removedAt: null,
    topics: [], ...overrides }
}

beforeEach(() => { vi.clearAllMocks() })

test.each([true, false])('includes General immediately for groups with isForum=%s and no registered topics', async (isForum) => {
  telegramGroups.mockResolvedValue([group({ isForum })])
  const [result] = await fetchTelegramGroups('workspace')
  expect(telegramGroups).toHaveBeenCalledWith('workspace')
  expect(result.topics).toEqual([{ threadId: null, name: 'General', closed: false }])
})

test('keeps existing topics and their states after General without changing the API response', async () => {
  const registered = group({ active: false, topics: [
    { threadId: 8502, name: 'Service and Daily Bread', closed: false },
    { threadId: 8769, name: 'Educations', closed: true },
  ] })
  telegramGroups.mockResolvedValue([registered])
  const [result] = await fetchTelegramGroups('workspace')
  expect(result.active).toBe(false)
  expect(result.topics).toEqual([{ threadId: null, name: 'General', closed: false }, ...registered.topics])
  expect(registered.topics).toHaveLength(2)
})

test('uses the topic-less destination for Telegram General ID 1 without duplicating it or losing its closed state', async () => {
  telegramGroups.mockResolvedValue([group({ topics: [
    { threadId: 1, name: 'General', closed: true },
    { threadId: 8502, name: 'Service', closed: false },
  ] })])
  const [result] = await fetchTelegramGroups('workspace')
  expect(result.topics).toEqual([
    { threadId: null, name: 'General', closed: true },
    { threadId: 8502, name: 'Service', closed: false },
  ])
})

test('keeps load failures visible instead of inventing available destinations', async () => {
  const failure = new Error('Permission denied')
  telegramGroups.mockRejectedValue(failure)
  await expect(fetchTelegramGroups('workspace')).rejects.toBe(failure)
})

test('keeps the existing group activation operation', async () => {
  setActive.mockResolvedValue(undefined)
  await setTelegramGroupActive('workspace', '-100123', true)
  expect(setActive).toHaveBeenCalledWith('workspace', '-100123', true)
})
