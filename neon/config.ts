import { defineConfig } from '@neon/config'

function configuredEnvironment(names: readonly string[], env: NodeJS.ProcessEnv): Record<string, string> {
  const values: Record<string, string> = {}
  for (const name of names) if (env[name]) values[name] = env[name]
  return values
}

export function createNeonConfig(env: NodeJS.ProcessEnv = process.env) {
  const jobsEnabled = env.MOC_ENABLE_PRODUCTION_JOBS === 'true' && env.MOC_NEON_BRANCH === 'production'
  const shared = configuredEnvironment(['CONSOLE_BASE_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'], env)
  const auth = configuredEnvironment(['BETTER_AUTH_SECRET', 'MOC_AUTH_SERVICE_SECRET', 'MOC_AUTH_TRUSTED_ORIGINS', 'MOC_AUTH_PUBLIC_BASE_URL', 'MOC_CONSOLE_ORIGIN', 'MOC_AUTH_COOKIE_SECURE', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'], env)
  // Neon injects branch-scoped database and S3 credentials. These are never
  // copied into browser builds or pinned to a different branch's database.
  return defineConfig({
    auth: false,
    dataApi: false,
    buckets: { avatars: { access: 'private' }, media: { access: 'private' }, 'broadcast-media': { access: 'private' } },
    functions: {
      auth: { name: 'MoC authentication', source: './neon/functions/auth.ts', env: auth },
      uploads: { name: 'MoC upload finalization', source: './neon/functions/uploads.ts' },
      archive: { name: 'MoC weekly archive', source: './neon/functions/weekly-archive.ts' },
      notifications: { name: 'MoC notification deliveries', source: './neon/functions/notification-deliveries.ts', env: shared },
      scheduled: { name: 'MoC scheduled messages', source: './neon/functions/scheduled-messages.ts', env: shared },
      streamsync: { name: 'MoC provider synchronization', source: './neon/functions/stream-sync.ts', env: shared },
    },
    // Initial deployment remains inert. Enable only after import/parity and
    // removal of the old scheduler; inherited child-branch triggers stay off.
    triggers: {
      'moc-weekly-archive': { type: 'schedule', function: 'archive', cron: '0 0 * * 1', enabled: jobsEnabled },
      'moc-notification-deliveries-daily': { type: 'schedule', function: 'notifications', cron: '0 1 * * *', enabled: jobsEnabled },
      'moc-scheduled-messages-hourly': { type: 'schedule', function: 'scheduled', cron: '0 * * * *', enabled: jobsEnabled },
      'moc-provider-stream-sync-daily': { type: 'schedule', function: 'streamsync', cron: '0 9 * * *', enabled: jobsEnabled },
      'storage-uploads': { type: 'schedule', function: 'uploads', cron: '* * * * *', enabled: jobsEnabled },
    },
  })
}
