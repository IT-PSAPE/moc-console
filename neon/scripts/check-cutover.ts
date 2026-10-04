import { Pool } from 'pg'

const required = [
  'NEON_DATABASE_URL', 'NEON_PROJECT_ID',
  'BETTER_AUTH_SECRET', 'MOC_AUTH_SERVICE_SECRET', 'MOC_AUTH_TRUSTED_ORIGINS',
  'MOC_AUTH_PUBLIC_BASE_URL', 'MOC_CONSOLE_ORIGIN', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM',
] as const

export function checkCutoverEnvironment(env: NodeJS.ProcessEnv): { missing: string[]; invalid: string[] } {
  const missing = required.filter((name) => !env[name]?.trim())
  const invalid: string[] = []
  for (const name of ['NEON_DATABASE_URL']) {
    if (!env[name]) continue
    try { if (!['postgres:', 'postgresql:'].includes(new URL(env[name]).protocol)) invalid.push(name) }
    catch { invalid.push(name) }
  }
  if (env.NEON_PROJECT_ID && env.NEON_PROJECT_ID !== 'blue-wind-16947728') invalid.push('NEON_PROJECT_ID')
  for (const name of ['BETTER_AUTH_SECRET', 'MOC_AUTH_SERVICE_SECRET']) {
    if (env[name] && env[name].length < 32) invalid.push(name)
  }
  for (const name of ['MOC_AUTH_PUBLIC_BASE_URL', 'MOC_CONSOLE_ORIGIN']) {
    if (!env[name]) continue
    try {
      const parsed = new URL(env[name])
      if (parsed.protocol !== 'https:' || parsed.origin !== env[name]) invalid.push(name)
    } catch { invalid.push(name) }
  }
  if (env.MOC_AUTH_TRUSTED_ORIGINS) {
    const origins = env.MOC_AUTH_TRUSTED_ORIGINS.split(',').map((origin) => origin.trim())
    for (const origin of origins) {
      try { if (new URL(origin).origin !== origin || new URL(origin).protocol !== 'https:') invalid.push('MOC_AUTH_TRUSTED_ORIGINS') }
      catch { invalid.push('MOC_AUTH_TRUSTED_ORIGINS') }
    }
  }
  if (env.MOC_ENABLE_PRODUCTION_JOBS === 'true' && env.MOC_NEON_BRANCH !== 'production') invalid.push('MOC_NEON_BRANCH')
  return { missing, invalid }
}

async function checkTargetSchema(connectionString: string): Promise<boolean> {
  const pool = new Pool({connectionString, max:1, connectionTimeoutMillis:5000})
  try {
    const result = await pool.query<{ready:boolean}>(
      `SELECT to_regclass('moc_auth."user"') IS NOT NULL
        AND to_regclass('moc_auth.account') IS NOT NULL
        AND to_regclass('moc_auth.session') IS NOT NULL
        AND to_regclass('moc_auth.verification') IS NOT NULL AS ready`,
    )
    return result.rows[0]?.ready === true
  } finally { await pool.end() }
}

if (process.argv.some((value) => value.endsWith('/check-cutover.ts') || value === 'neon/scripts/check-cutover.ts')) {
  const environment = checkCutoverEnvironment(process.env)
  let schema: boolean | null = null
  if (process.argv.includes('--schema') && process.env.NEON_DATABASE_URL && !environment.invalid.includes('NEON_DATABASE_URL')) {
    try { schema = await checkTargetSchema(process.env.NEON_DATABASE_URL) }
    catch { schema = false }
  }
  console.log(JSON.stringify({environment, schema, ready:environment.missing.length === 0 && environment.invalid.length === 0 && schema !== false}))
  if (environment.missing.length || environment.invalid.length || schema === false) process.exitCode = 1
}
