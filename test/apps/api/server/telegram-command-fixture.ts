type Command = { command: string; description: string; is_ephemeral?: boolean }
type Role = { can_update: boolean; can_manage_roles: boolean }
type Member = { user_id: string; users: { telegram_chat_id: string | null }; roles: Role }
type Options = { failReads?: boolean; registered?: boolean; linked?: boolean; onlyRestricted?: boolean }
import type { QueryResultRow } from 'pg'
import { setSqlFixture } from './sql-fixture.js'

export function createTelegramCommandFixture(options: Options = {}) {
  const originalFetch = globalThis.fetch
  const saved = { TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN }
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  const telegramCalls: Array<{ method: string; body: Record<string, unknown> }> = []
  const writes: Array<{ table: string; body: Record<string, unknown> }> = []
  const members: Member[] = [
    { user_id: 'admin-1', users: { telegram_chat_id: '456' }, roles: { can_update: true, can_manage_roles: true } },
    { user_id: 'editor-1', users: { telegram_chat_id: '789' }, roles: { can_update: true, can_manage_roles: false } },
    { user_id: 'viewer-1', users: { telegram_chat_id: '987' }, roles: { can_update: false, can_manage_roles: false } },
    { user_id: 'unlinked-1', users: { telegram_chat_id: null }, roles: { can_update: true, can_manage_roles: true } },
  ]
  const menus = new Map<string, Command[]>()
  let registered = options.registered ?? true
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
  const key = (type: string, userId?: number) => `${type}:${userId ?? ''}`
  const query = async (text: string, values: readonly unknown[]): Promise<Record<string, unknown>[]> => {
    if (text.includes('FROM public.workspaces')) {
      const slug = String(values[0])
      return [{ id: slug === 'other' ? 'workspace-2' : 'workspace-1', slug: slug === 'other' ? 'other' : 'example' }]
    }
    if (text.includes('public.telegram_groups')) {
      if (text.startsWith('INSERT')) { registered = true; writes.push({ table: 'telegram_groups', body: { values } }); return [] }
      if (text.startsWith('UPDATE')) { registered = false; return [] }
      if (text.includes('WHERE g.chat_id=$1')) return registered ? [{ workspace_id: 'workspace-1', slug: 'example' }] : []
      return registered ? [{ chat_id: '-100123', workspace_id: 'workspace-1' }] : []
    }
    if (text.includes('FROM public.users')) {
      const member = members.find(item => item.users.telegram_chat_id === String(values[0]))
      return options.linked === false || !member ? [] : [{ id: member.user_id }]
    }
    if (text.includes('JOIN public.roles')) {
      if (text.includes('SELECT r.can_manage_roles')) {
        const member = members.find(item => item.user_id === String(values[1]))
        return member && values[0] === 'workspace-1' ? [{ can_manage_roles: member.roles.can_manage_roles }] : []
      }
      const workspaceId = values[0]
      const userId = values[1]
      return members.filter(item => (!workspaceId || workspaceId === 'workspace-1') && (!userId || item.user_id === userId))
        .map(item => ({ telegram_chat_id: item.users.telegram_chat_id, can_update: item.roles.can_update, can_manage_roles: item.roles.can_manage_roles }))
    }
    if (text.includes('INSERT INTO public.telegram_group_topics')) { writes.push({ table: 'telegram_group_topics', body: { values } }); return [] }
    if (text.includes('UPDATE public.telegram_group_topics')) { writes.push({ table: 'telegram_group_topics', body: { values } }); return [] }
    return []
  }
  setSqlFixture({queryRows:async(text,values)=>await query(text,values) as QueryResultRow[]})
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
    const method = init?.method ?? 'GET'
    const table = url.pathname.split('/').pop() ?? ''
    if (url.origin === 'https://api.telegram.org') {
      telegramCalls.push({ method: table, body })
      const scope = body.scope as { type: string; user_id?: number } | undefined
      if (table === 'getMyCommands') {
        if (options.failReads) return json({ ok: false, error_code: 503, description: 'Unavailable' }, 503)
        const configured: Record<string, Command[]> = {
          default: [{ command: 'help', description: 'Help' }, { command: 'register_group', description: 'Old public registration' }],
          all_group_chats: [{ command: 'status', description: 'Status' }, { command: 'manage_messages', description: 'Old public management' }],
          all_chat_administrators: [{ command: 'register_topic', description: 'Old Telegram admin registration' }],
          chat: [{ command: 'help', description: 'Group help' }, { command: 'about', description: 'About' }, { command: 'register_topic', description: 'Old public topic registration' }],
        }
        const initial = configured[scope!.type] ?? []
        return json({ ok: true, result: menus.get(key(scope!.type, scope?.user_id)) ?? (options.onlyRestricted ? initial.filter(command => command.command.startsWith('register_') || command.command === 'manage_messages') : initial) })
      }
      if (table === 'setMyCommands') menus.set(key(scope!.type, scope?.user_id), body.commands as Command[])
      return json({ ok: true, result: table === 'sendMessage' ? { message_id: 10 } : true })
    }
    return json({ message: `Unexpected ${method} ${url.pathname}` }, 500)
  }
  return {
    members, telegramCalls, writes,
    commands(type: string, userId?: number): Command[] { return menus.get(key(type, userId)) ?? [] },
    menu(type: string, userId?: number): string[] { return (menus.get(key(type, userId)) ?? []).map(command => command.command) },
    restore(): void {
      globalThis.fetch = originalFetch
      if (saved.TELEGRAM_BOT_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = saved.TELEGRAM_BOT_TOKEN
    },
    query,
  }
}
