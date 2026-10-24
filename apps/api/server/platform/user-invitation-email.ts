import { sendAuthEmail } from "@moc/backend/auth/email"
import { renderInvitationEmail } from "@moc/backend/auth/email-template"

export async function sendInvitationEmail(email: string): Promise<boolean> {
  try {
    const configuredOrigin = process.env.MOC_CONSOLE_ORIGIN
    if (!configuredOrigin || new URL(configuredOrigin).origin !== configuredOrigin) throw new Error("Console origin is invalid")
    await sendAuthEmail({ to: email, ...renderInvitationEmail(`${configuredOrigin}/login`) })
    return true
  } catch {
    return false
  }
}
