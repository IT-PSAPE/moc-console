import * as React from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { HookRuntime, createMockReactModule } from "../../../../broadcast/src/features/test-hook-runtime"

const toast = vi.fn()
const invite = vi.fn()
let invitations: Array<{ id: string; email: string; createdAt: string; expiresAt: string }> = []
vi.doMock("react", () => ({ ...React, ...createMockReactModule() }))
vi.doMock("../../../../../../apps/console/src/features/users/users-provider", () => ({
  useUsers: () => ({
    state: { users: [], invitations, roles: [], isLoading: false, isInitialLoading: false, error: null },
    actions: { loadUsers: vi.fn(), retryUsers: vi.fn(), changeRole: vi.fn(), invite, resendInvitation: vi.fn(), revokeInvitation: vi.fn() },
  }),
}))
vi.doMock("../../../../../../apps/console/src/lib/workspace-context", () => ({ useWorkspace: () => ({ role: { can_manage_roles: true }, currentWorkspaceId: "workspace-a" }) }))
vi.doMock("@moc/ui/components/feedback/feedback-provider", () => ({ useFeedback: () => ({ toast }) }))
vi.doMock("../../../../../../apps/console/src/hooks/use-query-text", () => ({ useQueryText: () => ["", vi.fn()] }))
vi.doMock("../../../../../../apps/console/src/features/scheduled-messages/services/scheduled-message-service", () => ({ mutateScheduledMessage: vi.fn() }))

const { useMembersScreen } = await import("../../../../../../apps/console/src/features/users/use-members-screen")

beforeEach(() => {
  invitations = []
  toast.mockReset()
  invite.mockReset().mockResolvedValue({ invitation: { id: "invite-1", email: "person@example.com", createdAt: "2026-10-24T00:00:00Z", expiresAt: "2026-10-31T00:00:00Z" }, emailSent: true })
})

afterEach(() => vi.restoreAllMocks())

test("creates an invitation using a trimmed lowercase email and reports successful delivery", async () => {
  const runtime = new HookRuntime(useMembersScreen)
  let result = runtime.render()
  result.actions.changeEmail({ target: { value: "  Person@Example.COM " } } as React.ChangeEvent<HTMLInputElement>)
  result = runtime.rerender()
  const preventDefault = vi.fn()
  await result.actions.submitInvitation({ preventDefault } as unknown as React.FormEvent<HTMLFormElement>)

  expect(preventDefault).toHaveBeenCalledOnce()
  expect(invite).toHaveBeenCalledWith("person@example.com")
  expect(toast).toHaveBeenCalledWith({ title: "Invitation sent", variant: "success" })
  expect(runtime.rerender().state.email).toBe("")
  runtime.unmount()
})

test("reports when an invitation is saved but email delivery fails", async () => {
  invite.mockResolvedValueOnce({ invitation: { id: "invite-1", email: "person@example.com", createdAt: "2026-10-24T00:00:00Z", expiresAt: "2026-10-31T00:00:00Z" }, emailSent: false })
  const runtime = new HookRuntime(useMembersScreen)
  let result = runtime.render()
  result.actions.changeEmail({ target: { value: "person@example.com" } } as React.ChangeEvent<HTMLInputElement>)
  result = runtime.rerender()
  await result.actions.submitInvitation({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>)

  expect(toast).toHaveBeenCalledWith({ title: "Invitation saved, but email could not be delivered", description: "Use Resend to try again.", variant: "error" })
  runtime.unmount()
})

test("labels expired invitations as expired instead of as upcoming expiries", () => {
  invitations = [{ id: "invite-old", email: "old@example.com", createdAt: "1999-01-01T00:00:00Z", expiresAt: "2000-01-01T00:00:00Z" }]
  const runtime = new HookRuntime(useMembersScreen)
  const result = runtime.render()
  expect(result.meta.invitations[0]?.formattedExpiry).toContain("Expired")
  runtime.unmount()
})
