import nodemailer, { type Transporter } from "nodemailer"

let mailTransport: Transporter | undefined

function getMailTransport(): Transporter {
  if (mailTransport) return mailTransport
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const port = Number(process.env.SMTP_PORT ?? "587")
  if (!host || !user || !password || !Number.isInteger(port)) throw new Error("SMTP is not configured")
  mailTransport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password } })
  return mailTransport
}

export async function sendAuthEmail(input: { to: string; subject: string; text: string }): Promise<void> {
  const from = process.env.SMTP_FROM
  if (!from) throw new Error("SMTP sender is not configured")
  await getMailTransport().sendMail({ from, to: input.to, subject: input.subject, text: input.text })
}
