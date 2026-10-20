export type AuthConfiguration = { publicBaseUrl: string; trustedOrigins: string[]; secureCookies: boolean }
const localOrigin = 'http://localhost:5173'

function isOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return url.origin === value && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
  } catch { return false }
}

export function authConfigurationIssues(env: NodeJS.ProcessEnv): string[] {
  const issues = new Set<string>()
  const base = env.MOC_AUTH_PUBLIC_BASE_URL?.trim()
  const consoleOrigin = env.MOC_CONSOLE_ORIGIN?.trim()
  const origins = (env.MOC_AUTH_TRUSTED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean)
  if (env.NODE_ENV === 'production' && !base) issues.add('MOC_AUTH_PUBLIC_BASE_URL')
  for (const [key, value] of [['MOC_AUTH_PUBLIC_BASE_URL', base], ['MOC_CONSOLE_ORIGIN', consoleOrigin]] as const) {
    if (value && !isOrigin(value)) issues.add(key)
  }
  if (base && consoleOrigin && base !== consoleOrigin) {
    issues.add('MOC_AUTH_PUBLIC_BASE_URL'); issues.add('MOC_CONSOLE_ORIGIN')
  }
  const publicOrigin = base || consoleOrigin || localOrigin
  if ((env.NODE_ENV === 'production' && !origins.length) || origins.some(value => !isOrigin(value)) || (origins.length && !origins.includes(publicOrigin))) issues.add('MOC_AUTH_TRUSTED_ORIGINS')
  if (env.MOC_AUTH_COOKIE_SECURE && !['true', 'false'].includes(env.MOC_AUTH_COOKIE_SECURE)) issues.add('MOC_AUTH_COOKIE_SECURE')
  if (publicOrigin.startsWith('https:') && env.MOC_AUTH_COOKIE_SECURE === 'false') issues.add('MOC_AUTH_COOKIE_SECURE')
  return [...issues]
}

export function getAuthConfiguration(env: NodeJS.ProcessEnv = process.env): AuthConfiguration {
  const issues = authConfigurationIssues(env)
  if (issues.length) throw new Error(`Invalid authentication configuration: ${issues.join(', ')}`)
  const publicBaseUrl = env.MOC_AUTH_PUBLIC_BASE_URL?.trim() || env.MOC_CONSOLE_ORIGIN?.trim() || localOrigin
  const configured = (env.MOC_AUTH_TRUSTED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean)
  return {
    publicBaseUrl,
    trustedOrigins: configured.length ? configured : [publicBaseUrl],
    secureCookies: env.MOC_AUTH_COOKIE_SECURE === 'true' || (env.MOC_AUTH_COOKIE_SECURE !== 'false' && publicBaseUrl.startsWith('https:')),
  }
}
