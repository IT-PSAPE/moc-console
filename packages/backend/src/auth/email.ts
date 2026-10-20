import nodemailer, { type Transporter } from "nodemailer"
import type { AuthEmailContent } from "./email-template.js"

let mailTransport: Transporter | undefined

type SmtpSettings = { host: string; user: string; password: string; port: number }

function getSmtpSettings(): SmtpSettings | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const port = Number(process.env.SMTP_PORT ?? "587")
  if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65_535) return null
  return { host, user, password, port }
}

export function isAuthEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_FROM) && getSmtpSettings() !== null
}

function getMailTransport(): Transporter {
  if (mailTransport) return mailTransport
  const settings = getSmtpSettings()
  if (!settings) throw new Error("SMTP is not configured")
  const { host, user, password, port } = settings
  mailTransport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password } })
  return mailTransport
}

export async function sendAuthEmail(input: AuthEmailContent & { to: string }): Promise<void> {
  const from = process.env.SMTP_FROM
  if (!from) throw new Error("SMTP sender is not configured")
  await getMailTransport().sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html })
}
