import { escapeHtml } from "@moc/notifications"

export type AuthEmailContent = { subject: string; text: string; html: string }

export function renderInvitationEmail(actionUrl: string): AuthEmailContent {
  const url = new URL(actionUrl)
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid invitation link")
  const link = escapeHtml(url.href).replaceAll('"', "&quot;").replaceAll("'", "&#39;")
  const title = "You are invited to MOC Console"
  const description = "Sign in with Google using the email address that received this invitation. Signing in with Google accepts your invitation and grants access to the workspace."
  const expiry = "This invitation expires in 7 days."
  const text = `${title}\n\n${description}\n\nSign in with Google:\n${url.href}\n\n${expiry}\n\nMOC Console · Workspace access`
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><title>${title}</title></head>
<body style="margin:0;padding:32px 16px;background:#F6F6F6;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;">
<tr><td style="padding:32px 40px;border-bottom:1px solid #E8E8E8;"><span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:#FF1493;color:#FFFFFF;text-align:center;font-weight:bold;line-height:28px;">M</span> <strong style="margin-left:8px;">MOC Console</strong></td></tr>
<tr><td style="padding:36px 40px 32px;"><h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;">${title}</h1>
<p style="margin:0 0 28px;font-size:15px;line-height:1.6;">${description}</p>
<p style="margin:0 0 20px;"><a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;border-radius:8px;background:#D60076;color:#FFFFFF;font-weight:bold;text-decoration:none;">Sign in with Google</a></p>
<p style="margin:0 0 16px;color:#707070;font-size:13px;line-height:1.5;">${expiry} This link alone does not grant access.</p>
<p style="margin:0;word-break:break-all;"><a href="${link}" style="color:#525252;font:12px/1.6 Consolas,Menlo,monospace;">${link}</a></p></td></tr>
<tr><td style="padding:20px 40px 32px;border-top:1px solid #E8E8E8;color:#707070;font-size:13px;">MOC Console · Workspace access</td></tr>
</table></td></tr></table></body></html>`
  return { subject: title, text, html }
}
