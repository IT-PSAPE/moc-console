import { describe, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createNeonConfig } from '../../neon/config'

describe('Neon infrastructure policy', () => {
  test('declares only private storage and existing Neon worker entrypoints', () => {
    const config = createNeonConfig({})
    expect(config.auth).toBe(false)
    expect(config.dataApi).toBe(false)
    for (const bucket of Object.values(config.buckets)) expect(bucket.access).toBe('private')
    for (const fn of Object.values(config.functions)) expect(existsSync(resolve(fn.source))).toBe(true)
    expect(config.functions.auth.env).not.toHaveProperty('DATABASE_URL')
    expect(config.functions.uploads).not.toHaveProperty('env')
  })
  test('keeps every schedule disabled until the production cutover is explicit', () => {
    for (const env of [{}, {MOC_ENABLE_PRODUCTION_JOBS:'true'}, {MOC_ENABLE_PRODUCTION_JOBS:'true',MOC_NEON_BRANCH:'preview'}]) {
      for (const trigger of Object.values(createNeonConfig(env).triggers)) expect(trigger.enabled).toBe(false)
    }
    const config = createNeonConfig({MOC_ENABLE_PRODUCTION_JOBS:'true',MOC_NEON_BRANCH:'production'})
    expect(config.triggers['moc-weekly-archive'].cron).toBe('0 0 * * 1')
    expect(config.triggers['moc-notification-deliveries-daily'].cron).toBe('0 1 * * *')
    expect(config.triggers['moc-provider-stream-sync-daily'].cron).toBe('0 9 * * *')
    expect(config.triggers['moc-scheduled-messages-hourly'].cron).toBe('0 * * * *')
    expect(Object.values(config.triggers).every((trigger)=>trigger.enabled)).toBe(true)
  })
})
