import { Select } from "@moc/ui/components/form/select"
import type { Role } from "@moc/types/requests/assignee"

type UserRoleSelectProps = {
  userId: string
  role: Role | null
  roles: Role[]
  onChange: (userId: string, roleId: string) => void
}

export function UserRoleSelect({ userId, role, roles, onChange }: UserRoleSelectProps) {
  const items = roles.map((item) => ({ label: item.name, value: item.id }))

  function handleChange(roleId: string | null) {
    if (roleId && roleId !== role?.id) onChange(userId, roleId)
  }

  function renderRole(item: Role) {
    return <Select.Item key={item.id} value={item.id}>{item.name}</Select.Item>
  }

  return (
    <Select.Root name={`role-${userId}`} items={items} value={role?.id ?? null} onValueChange={handleChange}>
      <Select.Trigger aria-label="Member role" className="w-36 capitalize" />
      <Select.Content>{roles.map(renderRole)}</Select.Content>
    </Select.Root>
  )
}
