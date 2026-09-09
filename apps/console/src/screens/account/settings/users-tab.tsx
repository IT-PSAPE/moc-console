import { UsersProvider } from "@/features/users/users-provider"
import { UsersTabContent } from "./users-tab-content"

export function UsersTab() {
  return (
    <UsersProvider>
      <UsersTabContent />
    </UsersProvider>
  )
}
