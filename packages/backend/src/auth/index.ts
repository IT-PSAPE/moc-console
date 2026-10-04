import { betterAuth } from "better-auth"
import { Pool } from "pg"
import type { Pool as PoolType } from "pg"
import { sendAuthEmail } from "./email.js"
import { createProfileAndJoinRequest, syncProfileEmail } from "./profile.js"
import { hashPassword, verifyPassword } from "./password.js"

let authPool: PoolType | undefined

function getAuthPool(): PoolType {
  if (authPool) return authPool
  const connectionString = process.env.NEON_AUTH_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL
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

function trustedOrigins(): string[] {
  const configured = (process.env.MOC_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)
  return configured.length ? configured : ["http://localhost:5173"]
}

export function getAuth() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required in production")
  const authPublicBaseUrl = process.env.MOC_AUTH_PUBLIC_BASE_URL ?? process.env.MOC_CONSOLE_ORIGIN ?? "http://localhost:5173"
  const secureCookies = process.env.MOC_AUTH_COOKIE_SECURE === "true"
    || (process.env.MOC_AUTH_COOKIE_SECURE !== "false" && new URL(authPublicBaseUrl).protocol === "https:")
  return betterAuth({
    secret,
    database: getAuthPool(),
    baseURL: authPublicBaseUrl,
    trustedOrigins: trustedOrigins(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({ to: user.email, subject: "Reset your MoC password", text: `Reset your password using this link:\n\n${url}` })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({ to: user.email, subject: "Verify your MoC email", text: `Verify your email using this link:\n\n${url}` })
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
