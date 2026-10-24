import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import type { UserWithRole, WorkspaceInvitation } from "@/data/fetch-users"
import { useUsers } from "@/features/users/users-provider"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useQueryText } from "@/hooks/use-query-text"
import { mutateScheduledMessage } from "@/features/scheduled-messages/services/scheduled-message-service"

type InvitationRow = WorkspaceInvitation & { formattedExpiry: string; busyAction: "resend" | "revoke" | null; disabled: boolean; onResend: () => void; onRevoke: () => void }

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return "Expiry unavailable"
  const label = date.getTime() < Date.now() ? "Expired" : "Expires"
  return `${label} ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)}`
}

export function useMembersScreen() {
  const {
    state: { users, invitations, roles, isLoading, isInitialLoading, error },
    actions: { loadUsers, retryUsers, changeRole, invite: createInvitation, resendInvitation, revokeInvitation },
  } = useUsers()
  const { role, currentWorkspaceId } = useWorkspace()
  const canManage = role?.can_manage_roles === true
  const [search, setSearch] = useQueryText()
  const [email, setEmail] = useState("")
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [workingInvitation, setWorkingInvitation] = useState<{ id: string; action: "resend" | "revoke" } | null>(null)
  const normalizedSearch = search.trim().toLowerCase()
  const visibleUsers = users.filter(matchesSearch)
  const { toast } = useFeedback()

  function matchesSearch(user: UserWithRole): boolean {
    return `${user.name} ${user.surname} ${user.email} ${user.role?.name ?? ""}`.toLowerCase().includes(normalizedSearch)
  }

  function changeSearch(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value)
  }

  function changeEmail(event: ChangeEvent<HTMLInputElement>): void {
    setEmail(event.target.value)
    setInvitationError(null)
  }

  useEffect(() => {
    void loadUsers()
  }, [currentWorkspaceId, loadUsers])

  async function retryLoad(): Promise<void> {
    await retryUsers()
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return
    setIsInviting(true)
    setInvitationError(null)
    try {
      const result = await createInvitation(normalizedEmail)
      setEmail("")
      toast(result.emailSent
        ? { title: "Invitation sent", variant: "success" }
        : { title: "Invitation saved, but email could not be delivered", description: "Use Resend to try again.", variant: "error" })
    } catch (cause) {
      setInvitationError(cause instanceof Error ? cause.message : "Could not create invitation. Please try again.")
    } finally {
      setIsInviting(false)
    }
  }

  async function updateRole(userId: string, roleId: string): Promise<void> {
    try {
      await changeRole(userId, roleId)
      toast({ title: "Role updated", variant: "success" })
      if (currentWorkspaceId) {
        try { await mutateScheduledMessage(currentWorkspaceId, "commands.sync", {}) }
        catch { toast({ title: "Telegram command menus will refresh on the daily run", variant: "error" }) }
      }
    } catch (cause) {
      toast({ title: "Could not update role", description: cause instanceof Error ? cause.message : "Please try again.", variant: "error" })
    }
  }

  async function resend(id: string): Promise<void> {
    setWorkingInvitation({ id, action: "resend" })
    try {
      const result = await resendInvitation(id)
      toast(result.emailSent
        ? { title: "Invitation resent", variant: "success" }
        : { title: "Invitation is active, but email could not be delivered", description: "Try resending again later.", variant: "error" })
    } catch (cause) {
      toast({ title: "Could not resend invitation", description: cause instanceof Error ? cause.message : "Please try again.", variant: "error" })
    } finally {
      setWorkingInvitation(null)
    }
  }

  async function revoke(id: string): Promise<void> {
    setWorkingInvitation({ id, action: "revoke" })
    try {
      await revokeInvitation(id)
      toast({ title: "Invitation revoked", variant: "success" })
    } catch (cause) {
      toast({ title: "Could not revoke invitation", description: cause instanceof Error ? cause.message : "Please try again.", variant: "error" })
    } finally {
      setWorkingInvitation(null)
    }
  }

  const invitationRows: InvitationRow[] = invitations.map((invitation) => ({
    ...invitation,
    formattedExpiry: formatExpiry(invitation.expiresAt),
    busyAction: workingInvitation?.id === invitation.id ? workingInvitation.action : null,
    disabled: workingInvitation !== null,
    onResend: () => { void resend(invitation.id) },
    onRevoke: () => { void revoke(invitation.id) },
  }))

  return {
    actions: { changeSearch, changeEmail, retryLoad, submitInvitation, updateRole: (userId: string, roleId: string) => { void updateRole(userId, roleId) } },
    state: { search, email, invitationError, isInviting, loadError: error },
    meta: { isFiltered: normalizedSearch.length > 0, users: visibleUsers, totalUsers: users.length, roles, invitations: invitationRows, isLoading, canManage, isInitialLoading: isInitialLoading && !error },
  }
}
