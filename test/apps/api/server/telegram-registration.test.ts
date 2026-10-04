import assert from 'node:assert/strict'
import { describe, it as bunIt } from 'bun:test'
import { runWithSqlFixture } from './sql-fixture.js'
import { createTelegramCommandFixture } from './telegram-command-fixture.js'
function it(name:string,test:()=>Promise<void>):void { bunIt(name,()=>runWithSqlFixture(test)) }
const { processTelegramUpdate } = await import('../../../../apps/api/server/telegram-webhook-commands.js')

describe('Telegram registration permissions', () => {
  for (const command of ['register_group example', 'register_topic'] as const) {
    for (const [name, sender] of [['Editor', 789], ['Viewer', 987], ['unlinked user', 555]] as const) {
      it(`rejects a manually typed /${command} from an ${name}`, async () => {
        const fixture = createTelegramCommandFixture()
        try {
          await processTelegramUpdate({ message: { chat: { id: '-100123', type: 'supergroup' }, from: { id: sender }, text: `/${command}`, message_thread_id: 22 } })
          assert.equal(fixture.writes.length, 0)
          assert.equal(fixture.telegramCalls.some(call => call.method === 'sendMessage' && String(call.body.text).includes('permission')), true)
        } finally { fixture.restore() }
      })
    }
    it(`allows a workspace Admin to run /${command} and refreshes complete menus`, async () => {
      const fixture = createTelegramCommandFixture()
      try {
        await processTelegramUpdate({ message: { chat: { id: '-100123', type: 'supergroup' }, from: { id: 456 }, text: `/${command}`, message_thread_id: 22 } })
        assert.equal(fixture.writes.some(write => write.table === (command.startsWith('register_group') ? 'telegram_groups' : 'telegram_group_topics')), true)
        assert.deepEqual(fixture.menu('chat_member', 456), ['help', 'status', 'about', 'register_group', 'register_topic', 'manage_messages'])
      } finally { fixture.restore() }
    })
  }

  it('checks Admin permission in the destination workspace when moving a group', async () => {
    const fixture = createTelegramCommandFixture()
    try {
      await processTelegramUpdate({ message: { chat: { id: '-100123', type: 'supergroup' }, from: { id: 456 }, text: '/register_group other' } })
      assert.equal(fixture.writes.length, 0)
    } finally { fixture.restore() }
  })

  it('rejects message management from a Viewer even if the command is typed manually', async () => {
    const fixture = createTelegramCommandFixture()
    try {
      await processTelegramUpdate({ message: { chat: { id: '-100123', type: 'supergroup' }, from: { id: 987 }, text: '/manage_messages' } })
      assert.equal(fixture.writes.length, 0)
      assert.equal(fixture.telegramCalls.some(call => call.method === 'sendMessage' && call.body.ephemeral_message_parameters), true)
    } finally { fixture.restore() }
  })

  it('offers registration to the linked MOC Admin adding the bot before the group is registered', async () => {
    const fixture = createTelegramCommandFixture({ registered: false })
    try {
      await processTelegramUpdate({ my_chat_member: { chat: { id: '-100123', type: 'supergroup' }, from: { id: 456 }, new_chat_member: { status: 'member' } } })
      assert.deepEqual(fixture.menu('chat_member', 456), ['help', 'status', 'about', 'register_group', 'register_topic'])
      assert.equal(fixture.writes.length, 0)
    } finally { fixture.restore() }
  })

  it('does not offer registration to a Telegram administrator without a MOC Admin role', async () => {
    const fixture = createTelegramCommandFixture({ registered: false })
    try {
      await processTelegramUpdate({ my_chat_member: { chat: { id: '-100123', type: 'supergroup' }, from: { id: 789 }, new_chat_member: { status: 'administrator' } } })
      assert.deepEqual(fixture.menu('chat_member', 789), ['help', 'status', 'about'])
    } finally { fixture.restore() }
  })
})
