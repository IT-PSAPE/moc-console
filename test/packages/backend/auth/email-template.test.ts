import { expect, test } from "vitest"
import { renderInvitationEmail } from "../../../../packages/backend/src/auth/email-template.js"

const link = "https://console.example.test/login"

test("invitation email directs the invitee to Google sign-in and explains expiry", () => {
  const email = renderInvitationEmail(link)

  expect(email.subject).toBe("You are invited to MOC Console")
  expect(email.text).toContain(link)
  expect(email.text).toContain("expires in 7 days")
  expect(email.text).toContain("Sign in with Google")
  expect(email.html.match(/href="([^"]+)"/g)).toEqual([`href="${link}"`, `href="${link}"`])
  expect(email.html).toContain("This link alone does not grant access.")
  expect(email.html).toContain("MOC Console")
})

test.each(["javascript:alert(1)", "data:text/html,unsafe", "https://user:password@example.test/"])("rejects unsafe invitation links: %s", (url) => {
  expect(() => renderInvitationEmail(url)).toThrow("Invalid invitation link")
})

test("escapes invitation URLs inside HTML attributes", () => {
  const email = renderInvitationEmail('https://console.example.test/login?label="onclick="alert(1)')
  expect(email.html).not.toContain('"onclick=')
  expect(email.html).toContain("%22onclick=%22")
})
