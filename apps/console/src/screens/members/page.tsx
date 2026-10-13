import { MembersContent } from '@/features/users/members-content'
import { UsersProvider } from '@/features/users/users-provider'

export function MembersScreen() {
  return <UsersProvider><MembersContent /></UsersProvider>
}
