import { supabase } from "@moc/data/supabase"

export type BugReportContext = {
  url: string | null
  userAgent: string | null
  platform: string | null
  viewportWidth: number | null
  viewportHeight: number | null
  devicePixelRatio: number | null
  timezone: string | null
  locale: string | null
  appVersion: string | null
}

export type BugReportErrorContext = {
  name: string | null
  message: string | null
  stack: string | null
  componentStack: string | null
  occurredAt: string
  url: string | null
}

export type SubmitBugReportInput = {
  userId: string
  description: string
  errorContext?: BugReportErrorContext | null
} & BugReportContext

export function captureBugReportContext(): BugReportContext {
  if (typeof window === "undefined") {
    return {
      url: null,
      userAgent: null,
      platform: null,
      viewportWidth: null,
      viewportHeight: null,
      devicePixelRatio: null,
      timezone: null,
      locale: null,
      appVersion: import.meta.env.VITE_APP_VERSION ?? null,
    }
  }

  let timezone: string | null = null
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  } catch {
    timezone = null
  }

  return {
    url: window.location.href,
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform || null,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || null,
    timezone,
    locale: window.navigator.language || null,
    appVersion: import.meta.env.VITE_APP_VERSION ?? null,
  }
}

export async function submitBugReport(input: SubmitBugReportInput) {
  const { error } = await supabase.from("bug_reports").insert({
    user_id: input.userId,
    description: input.description,
    url: input.url,
    user_agent: input.userAgent,
    platform: input.platform,
    viewport_width: input.viewportWidth,
    viewport_height: input.viewportHeight,
    device_pixel_ratio: input.devicePixelRatio,
    timezone: input.timezone,
    locale: input.locale,
    app_version: input.appVersion,
    error_context: input.errorContext ?? null,
  })

  if (error) throw new Error(error.message)
}

export function captureBugReportErrorContext(
  error: unknown,
  componentStack: string | null,
): BugReportErrorContext {
  const isError = error instanceof Error
  const name = isError ? error.name : typeof error === "string" ? "Error" : "UnknownError"
  const message = isError ? error.message : typeof error === "string" ? error : null
  const stack = isError ? error.stack ?? null : null

  return {
    name,
    message,
    stack,
    componentStack,
    occurredAt: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : null,
  }
}
