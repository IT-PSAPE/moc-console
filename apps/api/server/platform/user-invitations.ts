import type { PlatformOperation } from "./context.js"
import { objectInput, stringField, uuidField } from "./input.js"
import { sendInvitationEmail } from "./user-invitation-email.js"
import { inviteWorkspaceEmail, listInvitations, resendWorkspaceInvitation, revokeWorkspaceInvitation, type InvitationRow } from "./user-invitation-store.js"

function mapInvitation(row: InvitationRow) {
  return { id: row.id, email: row.email, createdAt: row.created_at, expiresAt: row.expires_at }
}

function emptyInput(input: unknown): void {
  if (input === null || (typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0)) return
  objectInput(input, [])
}

async function invitationResult(invitation: InvitationRow) {
  return { invitation: mapInvitation(invitation), emailSent: await sendInvitationEmail(invitation.email) }
}

export const invitationOperations: Record<string, PlatformOperation> = {
  invitations: {
    permission: "can_manage_roles",
    async run(context, input) {
      emptyInput(input)
      return (await listInvitations(context)).map(mapInvitation)
    },
  },
  invite: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["email"])
      const invitation = await inviteWorkspaceEmail(context, stringField(record, "email"))
      return invitationResult(invitation)
    },
  },
  resendInvitation: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["invitationId"])
      const invitation = await resendWorkspaceInvitation(context, uuidField(record, "invitationId"))
      return invitationResult(invitation)
    },
  },
  revokeInvitation: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["invitationId"])
      await revokeWorkspaceInvitation(context, uuidField(record, "invitationId"))
      return null
    },
  },
}
