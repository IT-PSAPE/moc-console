import { escapeHtml } from '@moc/notifications'

export const AUTH_EMAIL_LINK_LIFETIME_SECONDS = 60 * 60
export type AuthEmailKind = 'verification' | 'password-reset'
export type AuthEmailContent = { subject: string; text: string; html: string }

const content = {
  verification: {
    subject: 'Verify your MoC email',
    title: 'Verify your email',
    description: 'Confirm your email address to finish setting up your MOC Console account.',
    action: 'Verify email',
    notice: "If you didn't create an account, you can safely ignore this email.",
  },
  'password-reset': {
    subject: 'Reset your MoC password',
    title: 'Reset your password',
    description: 'We received a request to reset the password for your MOC Console account. Choose a new password using the button below.',
    action: 'Reset password',
    notice: "Didn't request this? You can safely ignore this email. Your password won't change unless you choose and save a new one.",
  },
} satisfies Record<AuthEmailKind, { subject: string; title: string; description: string; action: string; notice: string }>

export function renderAuthEmail(kind: AuthEmailKind, actionUrl: string): AuthEmailContent {
  const url = new URL(actionUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid authentication email link')
  const copy = content[kind]
  const link = escapeHtml(url.href).replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  const expiry = 'This link expires in 1 hour.'
  const text = `${copy.title}\n\n${copy.description}\n\n${copy.action}:\n${url.href}\n\n${expiry}\n\n${copy.notice}\n\nMOC Console · Account security`
  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${copy.title}</title>
<style>
body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
table, td { mso-table-lspace:0; mso-table-rspace:0; }
body { margin:0 !important; padding:0 !important; width:100% !important; }
@media (prefers-color-scheme: dark) {
  .bg-page { background-color:#0F0F0F !important; }
  .bg-card { background-color:#171717 !important; }
  .text-title, .logo-text { color:#F4F4F4 !important; }
  .text-body { color:#E8E8E8 !important; }
  .text-muted { color:#ABABAB !important; }
  .text-mono { color:#CBCBCB !important; }
  .divider { background-color:#2D2D2D !important; }
}
[data-ogsc] .bg-page { background-color:#0F0F0F !important; }
[data-ogsc] .bg-card { background-color:#171717 !important; }
[data-ogsc] .text-title, [data-ogsc] .logo-text { color:#F4F4F4 !important; }
[data-ogsc] .text-body { color:#E8E8E8 !important; }
[data-ogsc] .text-muted { color:#ABABAB !important; }
[data-ogsc] .text-mono { color:#CBCBCB !important; }
[data-ogsc] .divider { background-color:#2D2D2D !important; }
@media screen and (max-width:600px) { .px { padding-left:24px !important; padding-right:24px !important; } }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:#F6F6F6;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${copy.description} ${expiry}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" bgcolor="#F6F6F6">
<tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="520" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-card" bgcolor="#FFFFFF" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;">
<tr><td class="px" style="padding:32px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="28" height="28" align="center" bgcolor="#FF1493" style="width:28px;height:28px;border-radius:8px;font:700 14px/28px Arial,Helvetica,sans-serif;color:#FFFFFF;">M</td>
<td width="10" style="width:10px;"></td><td class="logo-text" style="font:700 15px Arial,Helvetica,sans-serif;color:#1A1A1A;">MOC Console</td>
</tr></table></td></tr>
<tr><td class="divider" bgcolor="#E8E8E8" style="height:1px;font-size:0;line-height:1px;">&nbsp;</td></tr>
<tr><td class="px" style="padding:36px 40px 32px;">
<h1 class="text-title" style="margin:0 0 20px;font:700 26px/1.2 Arial,Helvetica,sans-serif;letter-spacing:-0.4px;color:#1A1A1A;">${copy.title}</h1>
<p class="text-body" style="margin:0 0 28px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#2D2D2D;">${copy.description}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#D60076" style="border-radius:8px;mso-padding-alt:14px 28px;">
<a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;border:1px solid #D60076;border-radius:8px;background-color:#D60076;color:#FFFFFF;font:700 15px/1.4 Arial,Helvetica,sans-serif;text-decoration:none;">${copy.action}</a>
</td></tr></table>
<p class="text-muted" style="margin:20px 0 24px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#707070;">${expiry}</p>
<p class="text-muted" style="margin:0 0 8px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#707070;">Or copy and paste this link into your browser:</p>
<p style="margin:0;word-break:break-all;overflow-wrap:anywhere;"><a class="text-mono" href="${link}" style="font:12px/1.6 Consolas,Menlo,monospace;color:#525252;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${link}</a></p>
</td></tr>
<tr><td class="px" style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="divider" bgcolor="#E8E8E8" style="height:1px;font-size:0;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<tr><td class="px text-muted" style="padding:20px 40px 32px;font:13px/1.6 Arial,Helvetica,sans-serif;color:#707070;">${copy.notice}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<p class="text-muted" style="margin:20px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#707070;">MOC Console &middot; Account security</p>
</td></tr></table>
</body></html>`
  return { subject: copy.subject, text, html }
}
