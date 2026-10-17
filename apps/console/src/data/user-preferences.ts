import type { UserPreferences } from '@moc/sdk/users'
import { moc } from '@/lib/moc-client'

export async function fetchUserPreferences(): Promise<UserPreferences> {
  return moc.users.getPreferences()
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  await moc.users.updatePreferences(preferences)
}
