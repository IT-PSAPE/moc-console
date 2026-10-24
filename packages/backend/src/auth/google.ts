import { verifyGoogleIdToken, type GoogleOptions, type GoogleProfile } from "better-auth/social-providers"

type GoogleTokens = Parameters<NonNullable<GoogleOptions["getUserInfo"]>>[0]
type GoogleUserInfo = Awaited<ReturnType<NonNullable<GoogleOptions["getUserInfo"]>>>

// Verify the token before using any identity claims for admission or linking.
// Better Auth still owns OAuth state, PKCE, code exchange, and the callback.
export async function verifiedGoogleUserInfo(tokens: GoogleTokens, clientId: string): Promise<GoogleUserInfo> {
  if (!tokens.idToken) return null
  const profile = await verifyGoogleIdToken({ token: tokens.idToken, audience: clientId })
  if (!profile || typeof profile.sub !== "string" || !profile.sub.trim()
    || typeof profile.email !== "string" || profile.email_verified !== true) return null
  const name = typeof profile.given_name === "string" ? profile.given_name.trim()
    : typeof profile.name === "string" ? profile.name.trim() : ""
  const surname = typeof profile.family_name === "string" ? profile.family_name.trim() : ""
  return {
    user: {
      name,
      surname,
      email: profile.email.trim().toLowerCase(),
      emailVerified: true,
      image: typeof profile.picture === "string" ? profile.picture : undefined,
    },
    // Claims are signed by Google; only sub is used by the provider's account
    // binding. Optional profile fields are deliberately not required for login.
    data: profile as unknown as GoogleProfile,
  }
}
