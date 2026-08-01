import type { ChangeEvent } from "react"
import { Divider } from "@moc/ui/components/display/divider"
import { Section } from "@moc/ui/components/display/section"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Input } from "@moc/ui/components/form/input"
import { Search } from "lucide-react"
import { useUsersSettings } from "./use-users-settings"
import { UsersTable } from "./users-table"

export function UsersTabContent() {
  const { state, actions, meta } = useUsersSettings()

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearch(event.target.value)
  }

  return (
    <Section>
      <Section.Header title="Members" />
      <Divider className="my-6" />
      <Section.Body className="gap-4">
        <div className="flex flex-1 justify-end">
          <Input aria-label="Search members" name="member-search" autoComplete="off" icon={<Search />} placeholder="Search members…" className="w-full max-w-md" value={state.search} onChange={handleSearchChange} />
        </div>
        {meta.isLoading
          ? <LoadingSpinner className="py-16" />
          : <UsersTable users={meta.users} roles={meta.roles} currentUserId={meta.currentUserId} canManage={meta.canManage} onRoleChange={actions.updateRole} />}
      </Section.Body>
    </Section>
  )
}
