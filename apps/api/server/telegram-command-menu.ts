import { getSupabaseAdmin } from './supabase-admin.js'
import { getTelegramCommands, setTelegramCommands, type TelegramCommand, type TelegramCommandScope } from './telegram.js'

type CommandPermission = 'can_manage_roles' | 'can_update'
type CommandPermissions = Record<CommandPermission, boolean>
type RestrictedCommand = { permission: CommandPermission; command: TelegramCommand }

// Each member scope replaces Telegram's broader menus; always include public commands.
// Permissions match the workspace checks in the corresponding command handlers.
const RESTRICTED_COMMANDS: RestrictedCommand[] = [
  { permission: 'can_manage_roles', command: { command: 'register_group', description: 'Register this group with MOC Console' } },
  { permission: 'can_manage_roles', command: { command: 'register_topic', description: 'Register this topic with MOC Console' } },
  { permission: 'can_update', command: { command: 'manage_messages', description: 'Manage active MOC messages', is_ephemeral: true } },
]

function isRestricted(command: TelegramCommand): boolean {
  return RESTRICTED_COMMANDS.some(restricted => restricted.command.command === command.command)
}

async function publicGroupCommands(chatId: string): Promise<{ commands: TelegramCommand[]; cleanup: Array<{ scope: TelegramCommandScope; commands: TelegramCommand[] }> } | null> {
  const scopes: TelegramCommandScope[] = [{ type: 'default' }, { type: 'all_group_chats' }, { type: 'all_chat_administrators' }, { type: 'chat', chat_id: chatId }, { type: 'chat_administrators', chat_id: chatId }]
  const results = await Promise.all(scopes.map(getTelegramCommands))
  if (results.some(result => !result.ok)) return null
  const commands = new Map<string, TelegramCommand>()
  const cleanup: Array<{ scope: TelegramCommandScope; commands: TelegramCommand[] }> = []
  for (const [index, result] of results.entries()) {
    if (!result.ok) continue
    const list = result.result ?? []
    const publicCommands = list.filter(command => !isRestricted(command))
    for (const command of publicCommands) commands.set(command.command, command)
    // Empty narrow scopes can fall back to broader menus. Remove legacy public
    // registrations there as well, without deleting unrelated public commands.
    if (index < 3 && list.some(isRestricted)) cleanup.push({ scope: scopes[index]!, commands: publicCommands })
  }
  return { commands: [...commands.values()], cleanup }
}

export async function syncTelegramGroupCommands(chatId: string, workspaceId?: string, userId?: string): Promise<{ failed: number }> {
  const publicMenu = await publicGroupCommands(chatId)
  if (!publicMenu) return { failed: 1 }
  const publicCommands = publicMenu.commands
  let query = getSupabaseAdmin().from('workspace_users').select('users(telegram_chat_id),roles(can_update,can_manage_roles)')
  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  if (userId) query = query.eq('user_id', userId)
  const { data: members, error } = workspaceId || userId ? await query : { data: [], error: null }
  if (error) throw new Error(error.message)

  // An unregistered group can only offer registration, based on the adding user's
  // workspace memberships. Message management needs a registered workspace.
  const permissions = new Map<string, CommandPermissions>()
  for (const member of members ?? []) {
    const user = Array.isArray(member.users) ? member.users[0] : member.users
    const role = Array.isArray(member.roles) ? member.roles[0] : member.roles
    if (!user?.telegram_chat_id) continue
    const previous = permissions.get(user.telegram_chat_id)
    permissions.set(user.telegram_chat_id, {
      can_manage_roles: previous?.can_manage_roles === true || role?.can_manage_roles === true,
      can_update: Boolean(workspaceId) && (previous?.can_update === true || role?.can_update === true),
    })
  }

  let failed = 0
  for (const { scope, commands } of publicMenu.cleanup) {
    if (!(await setTelegramCommands(scope, commands)).ok) failed++
  }
  // Telegram administrators are not necessarily MOC Admins; their fallback is public.
  for (const type of ['chat', 'chat_administrators'] as const) {
    if (!(await setTelegramCommands({ type, chat_id: chatId }, publicCommands)).ok) failed++
  }
  for (const [telegramId, allowed] of permissions) {
    const commands = [...publicCommands, ...RESTRICTED_COMMANDS.filter(item => allowed[item.permission]).map(item => item.command)]
    if (!(await setTelegramCommands({ type: 'chat_member', chat_id: chatId, user_id: Number(telegramId) }, commands)).ok) failed++
  }
  return { failed }
}
