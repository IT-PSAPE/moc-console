import { beforeEach, expect, test, vi } from 'vitest'
import type { MemberType } from '@moc/notifications'
import { assignMemberType, saveMemberTypeAndFetch } from '../../../../../apps/console/src/features/users/member-type-service'

const { memberTypes, saveMemberType, assignMemberTypeRequest } = vi.hoisted(() => ({
  memberTypes: vi.fn<(...args: unknown[]) => Promise<MemberType[]>>(),
  saveMemberType: vi.fn<(...args: unknown[]) => Promise<void>>(),
  assignMemberTypeRequest: vi.fn<(...args: unknown[]) => Promise<void>>(),
}))

vi.mock('../../../../../apps/console/src/lib/moc-client', () => ({
  moc: { users: { memberTypes, saveMemberType, assignMemberType: assignMemberTypeRequest } },
}))

beforeEach(() => { vi.clearAllMocks() })

test('creating a member type saves a new name and returns the server-assigned type', async () => {
  const created: MemberType = { id: 'crew', name: 'Crew', is_default: false }
  saveMemberType.mockResolvedValue(undefined)
  memberTypes.mockResolvedValue([created])

  const result = await saveMemberTypeAndFetch('workspace', 'Crew', null)

  expect(saveMemberType).toHaveBeenCalledWith('workspace', 'Crew', null)
  expect(result).toEqual({ types: [created], savedType: created })
})

test('renaming preserves the existing type identity and default status', async () => {
  const renamed: MemberType = { id: 'default', name: 'Core team', is_default: true }
  saveMemberType.mockResolvedValue(undefined)
  memberTypes.mockResolvedValue([renamed])

  const result = await saveMemberTypeAndFetch('workspace', 'Core team', 'default')

  expect(saveMemberType).toHaveBeenCalledWith('workspace', 'Core team', 'default')
  expect(result.savedType).toEqual(renamed)
})

test.each([
  ['create', null],
  ['rename', 'default'],
] as const)('%s failures are surfaced without loading a saved type', async (_operation, id) => {
  const failure = new Error('Permission denied')
  saveMemberType.mockRejectedValue(failure)

  await expect(saveMemberTypeAndFetch('workspace', 'New name', id)).rejects.toBe(failure)
  expect(memberTypes).not.toHaveBeenCalled()
})

test('assignment failures are surfaced to the caller', async () => {
  const failure = new Error('Assignment denied')
  assignMemberTypeRequest.mockRejectedValue(failure)

  await expect(assignMemberType('workspace', 'user', 'crew')).rejects.toBe(failure)
  expect(assignMemberTypeRequest).toHaveBeenCalledWith('workspace', 'user', 'crew')
})
