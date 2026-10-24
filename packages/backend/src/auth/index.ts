import { betterAuth } from "better-auth"
import { Pool } from "pg"
import type { Pool as PoolType } from "pg"
import { getAuthConfiguration } from "./configuration.js"
import { verifiedGoogleUserInfo } from "./google.js"
import { acceptInvitations, canSignInWithEmail } from "./invitations.js"

let authPool: PoolType | undefined

function getAuthPool(): PoolType {
  if (authPool) return authPool
  // Auth selects its schema at connection startup, which requires a direct
  // connection when Neon supplies both direct and transaction-pooled URLs.
  const connectionString = process.env.NEON_AUTH_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL
  if (!connectionString) throw new Error("Auth database connection is not configured")
  authPool = new Pool({
    connectionString,
    options: "-c search_path=moc_auth,public",
    max: 4,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 5_000,
    application_name: "moc-auth",
    allowExitOnIdle: true,
  })
  return authPool
}

export function getAuth() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required in production")
  const { publicBaseUrl, secureCookies, trustedOrigins } = getAuthConfiguration()
  return betterAuth({
    secret,
    database: getAuthPool(),
    baseURL: publicBaseUrl,
    trustedOrigins,
    onAPIError: { errorURL: `${publicBaseUrl}/login` },
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
        includeGrantedScopes: false,
        getUserInfo: async (tokens) => verifiedGoogleUserInfo(tokens, process.env.GOOGLE_CLIENT_ID ?? ""),
      },
    },
    user: {
      async validateUserInfo({ user, source }, context) {
        if (source.method !== "oauth" || source.oauth?.providerId !== "google"
          || source.oauth.profile?.email_verified !== true || user.emailVerified !== true
          || typeof user.email !== "string" || !await canSignInWithEmail(user.email)) {
          return { error: "invitation_required", errorDescription: "Sign in with the Google account invited to this workspace." }
        }
        // An existing Google identity must still assert the same email. Email
        // changes require an administrator to reconcile access explicitly.
        if (source.action !== "create-user" && typeof user.id === "string") {
          const stored = await context.context.internalAdapter.findUserById(user.id)
          if (!stored || stored.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) return { error: "account_email_changed" }
        }
      },
      fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
      additionalFields: {
        surname: { type: "string", required: false, defaultValue: "", input: true, fieldName: "surname" },
      },
    },
    session: {
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at", userId: "user_id", ipAddress: "ip_address", userAgent: "user_agent" },
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"], requireLocalEmailVerified: true, allowDifferentEmails: false, updateUserInfoOnLink: false },
      fields: {
        accountId: "account_id", providerId: "provider_id", userId: "user_id", accessToken: "access_token",
        refreshToken: "refresh_token", idToken: "id_token", accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at",
      },
    },
    verification: { fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
    databaseHooks: {
      account: { create: { before: async (account) => account.providerId === "google" } },
      session: {
        create: {
          async before(session, context) {
            if (!context) return false
            const user = await context.context.internalAdapter.findUserById(session.userId)
            const accounts = await context.context.internalAdapter.findAccounts(session.userId)
            if (!user?.emailVerified || !accounts.some((account) => account.providerId === "google")) return false
            await acceptInvitations({ ...user, surname: "surname" in user && typeof user.surname === "string" ? user.surname : "" })
          },
        },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      defaultCookieAttributes: { httpOnly: true, secure: secureCookies, sameSite: "lax", path: "/api" },
      useSecureCookies: secureCookies,
    },
  })
}
