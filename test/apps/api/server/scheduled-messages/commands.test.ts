import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { syncManagementCommands } from '../../../../../apps/api/server/scheduled-messages/commands.js'
import { createTelegramCommandFixture } from '../telegram-command-fixture.js'

describe('Telegram group command menus', () => {
  it('keeps public commands in every role menu and adds each role’s restricted commands', async () => {
    const fixture = createTelegramCommandFixture()
    try {
      assert.deepEqual(await syncManagementCommands(), { failed: 0 })
      assert.deepEqual(fixture.menu('chat'), ['help', 'status', 'about'])
      assert.deepEqual(fixture.menu('chat_administrators'), ['help', 'status', 'about'])
      assert.deepEqual(fixture.menu('chat_member', 456), ['help', 'status', 'about', 'register_group', 'register_topic', 'manage_messages'])
      assert.deepEqual(fixture.menu('chat_member', 789), ['help', 'status', 'about', 'manage_messages'])
      assert.deepEqual(fixture.menu('chat_member', 987), ['help', 'status', 'about'])
      const adminMenu = fixture.commands('chat_member', 456)
      assert.equal(adminMenu.find(command => command.command === 'manage_messages')?.is_ephemeral, true)
      assert.equal(adminMenu.filter(command => command.command === 'help').length, 1)
      assert.equal(adminMenu.find(command => command.command === 'help')?.description, 'Group help')
    } finally { fixture.restore() }
  })

  it('refreshes a downgraded member to public commands without losing the general menu', async () => {
    const fixture = createTelegramCommandFixture()
    try {
      await syncManagementCommands()
      fixture.members[0]!.roles = { can_manage_roles: false, can_update: false }
      await syncManagementCommands('workspace-1', 'admin-1')
      assert.deepEqual(fixture.menu('chat_member', 456), ['help', 'status', 'about'])
    } finally { fixture.restore() }
  })

  it('leaves existing menus intact if Telegram cannot read public commands', async () => {
    const fixture = createTelegramCommandFixture({ failReads: true })
    try {
      assert.deepEqual(await syncManagementCommands(), { failed: 1 })
      assert.equal(fixture.telegramCalls.some(call => call.method === 'setMyCommands'), false)
    } finally { fixture.restore() }
  })

  it('removes old public registrations from broader scopes even when there are no public commands', async () => {
    const fixture = createTelegramCommandFixture({ onlyRestricted: true })
    try {
      await syncManagementCommands()
      const writtenScopes = fixture.telegramCalls.filter(call => call.method === 'setMyCommands').map(call => (call.body.scope as { type: string }).type)
      assert.equal(writtenScopes.includes('default'), true)
      assert.equal(writtenScopes.includes('all_group_chats'), true)
      assert.equal(writtenScopes.includes('all_chat_administrators'), true)
      assert.deepEqual(fixture.menu('default'), [])
      assert.deepEqual(fixture.menu('all_group_chats'), [])
      assert.deepEqual(fixture.menu('all_chat_administrators'), [])
      assert.deepEqual(fixture.menu('chat_member', 987), [])
      assert.deepEqual(fixture.menu('chat_member', 456), ['register_group', 'register_topic', 'manage_messages'])
    } finally { fixture.restore() }
  })
})
