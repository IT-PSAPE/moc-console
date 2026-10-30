import { fixtureUserId, fixtureViewerId } from './fixture-data'
import { useFixtureRole } from './fixture-role'

export function useAuth() {
  const id = useFixtureRole() === 'viewer' ? fixtureViewerId : fixtureUserId
  const user = { id, email: 'jordan@example.test', name: 'Jordan', surname: 'Lee', emailVerified: true, image: null }
  return {
    user, profile: { id, name: 'Jordan', surname: 'Lee', email: user.email, telegramChatId: null, avatarUrl: null, currentDuty: 'Production team', statusMessage: null },
    session: { id: 'fixture-session', userId: id, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), user },
    loading: false, callbackError: null,
    signOut: async () => ({ error: null }), signInWithGoogle: async () => ({ error: null }), refreshProfile: async () => undefined,
  }
}
