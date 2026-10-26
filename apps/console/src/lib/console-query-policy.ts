type ConsoleQueryPolicy = {
  staleTime: number
  gcTime: number
  refetchInterval: number | false
  refetchIntervalInBackground: false
  refetchOnMount: true
  refetchOnWindowFocus: true
  refetchOnReconnect: true
}

const MINUTE = 60_000
const referenceResources = new Set([
  'request-categories', 'member-types', 'venues', 'venue-events',
  'notification-settings', 'notification-templates', 'youtube-playlists', 'preferences',
])
// These consumers live on pages or in open drawers, never in global providers.
const liveResources = new Set(['telegram-groups', 'users', 'notification-routes', 'scheduled-messages'])

export function consoleQueryPolicy(resource: string): ConsoleQueryPolicy {
  const family = resource.split(':')[0]
  const live = liveResources.has(family)
  return {
    staleTime: family === 'youtube-categories' ? 60 * MINUTE : referenceResources.has(family) ? 5 * MINUTE : live ? 30_000 : MINUTE,
    gcTime: 30 * MINUTE,
    refetchInterval: family === 'item-activity' || family === 'item-comments' ? 15_000 : live ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  }
}
