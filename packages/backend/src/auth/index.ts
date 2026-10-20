import { betterAuth } from "better-auth"
import { Pool } from "pg"
import type { Pool as PoolType } from "pg"
import { sendAuthEmail } from "./email.js"
import { AUTH_EMAIL_LINK_LIFETIME_SECONDS, renderAuthEmail } from "./email-template.js"
import { getAuthConfiguration } from "./configuration.js"
import { createProfileAndJoinRequest, syncProfileEmail } from "./profile.js"
import { hashPassword, verifyPassword } from "./password.js"

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
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: AUTH_EMAIL_LINK_LIFETIME_SECONDS,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({ to: user.email, ...renderAuthEmail("password-reset", url) })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: AUTH_EMAIL_LINK_LIFETIME_SECONDS,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({ to: user.email, ...renderAuthEmail("verification", url) })
      },
    },
    user: {
      fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
      additionalFields: {
        surname: { type: "string", required: true, input: true, fieldName: "surname" },
        workspaceSlug: { type: "string", required: false, input: true, fieldName: "workspace_slug" },
      },
    },
    session: {
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at", userId: "user_id", ipAddress: "ip_address", userAgent: "user_agent" },
    },
    account: {
      fields: {
        accountId: "account_id", providerId: "provider_id", userId: "user_id", accessToken: "access_token",
        refreshToken: "refresh_token", idToken: "id_token", accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at",
      },
    },
    verification: { fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
    databaseHooks: {
      user: {
        create: { after: async (user) => createProfileAndJoinRequest(user) },
        update: { after: async (user) => syncProfileEmail(user) },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      defaultCookieAttributes: { httpOnly: true, secure: secureCookies, sameSite: "lax", path: "/api" },
      useSecureCookies: secureCookies,
    },
  })
}
