export type ProviderOAuthConfig = {
  clientId: string
  clientSecret: string
}

/**
 * Thrown when this deployment is missing the environment variables a provider
 * needs. Kept distinct from route, permission and upstream failures because
 * nothing the caller does can make the request succeed: the deployment itself
 * is incomplete, and the only useful response names the variables to set.
 */
export class ProviderConfigError extends Error {
  readonly missing: readonly string[]

  constructor(label: string, missing: readonly string[]) {
    super(`${label} is not configured on this deployment. Set ${missing.join(" and ")}.`)
    this.name = "ProviderConfigError"
    this.missing = missing
  }
}

function firstConfigured(env: Record<string, string | undefined>, names: readonly string[]): string | null {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value) return value
  }
  return null
}

/**
 * Reads an OAuth client pair out of the environment, naming whatever is absent.
 * Each field accepts several variable names so a value can be shared with the
 * frontend's `VITE_`-prefixed copy; the first name is the canonical one and is
 * what a failure asks for. A variable set to whitespace counts as unset — an
 * empty value in a deployment dashboard is a mistake, not a configuration.
 */
export function resolveOAuthConfig(
  label: string,
  env: Record<string, string | undefined>,
  clientIdNames: readonly string[],
  clientSecretNames: readonly string[],
): ProviderOAuthConfig {
  const clientId = firstConfigured(env, clientIdNames)
  const clientSecret = firstConfigured(env, clientSecretNames)

  const missing: string[] = []
  if (!clientId) missing.push(clientIdNames[0])
  if (!clientSecret) missing.push(clientSecretNames[0])
  if (!clientId || !clientSecret) throw new ProviderConfigError(label, missing)

  return { clientId, clientSecret }
}
