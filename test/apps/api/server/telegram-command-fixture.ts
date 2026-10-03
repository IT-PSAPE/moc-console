type Command = { command: string; description: string; is_ephemeral?: boolean }
type Role = { can_update: boolean; can_manage_roles: boolean }
type Member = { user_id: string; users: { telegram_chat_id: string | null }; roles: Role }
type Options = { failReads?: boolean; registered?: boolean; linked?: boolean; onlyRestricted?: boolean }

export function createTelegramCommandFixture(options: Options = {}) {
  const originalFetch = globalThis.fetch
  const saved = { VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL, SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY, TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN }
  process.env.VITE_SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_SECRET_KEY = 'test-secret'
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
    if (table === 'telegram_groups') {
      if (method === 'POST') { registered = true; writes.push({ table, body }); return json(null, 201) }
      if (url.searchParams.has('chat_id')) return json(registered ? { workspace_id: 'workspace-1', workspaces: { slug: 'example' } } : null)
      return json(registered ? [{ chat_id: '-100123', workspace_id: 'workspace-1' }] : [])
    }
    if (table === 'users') {
      const telegramId = url.searchParams.get('telegram_chat_id')?.replace('eq.', '')
      const member = members.find(member => member.users.telegram_chat_id === telegramId)
      return json(options.linked === false || !member ? null : { id: member.user_id })
    }
    if (table === 'workspace_users') {
      const userId = url.searchParams.get('user_id')?.replace('eq.', '')
      const workspace = url.searchParams.get('workspace_id')?.replace('eq.', '')
      const selected = members.filter(member => (!userId || member.user_id === userId) && (!workspace || workspace === 'workspace-1'))
      return json(String(init?.headers && new Headers(init.headers).get('accept')).includes('object') ? selected[0] ?? null : selected)
    }
    if (table === 'workspaces') return json({ id: url.searchParams.get('slug') === 'eq.other' ? 'workspace-2' : 'workspace-1', slug: 'example' })
    if (table === 'telegram_group_topics' && method === 'POST') { writes.push({ table, body }); return json(null, 201) }
    return json({ message: `Unexpected ${method} ${url.pathname}` }, 500)
  }
  return {
    members, telegramCalls, writes,
    commands(type: string, userId?: number): Command[] { return menus.get(key(type, userId)) ?? [] },
    menu(type: string, userId?: number): string[] { return (menus.get(key(type, userId)) ?? []).map(command => command.command) },
    restore(): void {
      globalThis.fetch = originalFetch
      for (const [name, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    },
  }
}
