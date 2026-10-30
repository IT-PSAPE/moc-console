import { useCallback, useEffect } from 'react'
import type { DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { overviewDateKey } from './overview-agenda-records'
import { fetchDailyQuote } from '../daily-quotes/daily-quote-service'

export function useOverviewQuote(workspaceId: string | null, now: Date) {
  const resource = useWorkspaceResource<DailyQuoteSelection | null>({ workspaceId, resource: 'daily-quote', fetcher: fetchDailyQuote, emptyValue: null })
  const { data, load } = resource
  const day = data ? overviewDateKey(now, data.timezone) : null
  useEffect(() => {
    if (data && day !== data.date) void load(true)
  }, [data, day, load])
  const retry = useCallback(() => { void load(true) }, [load])
  return { quote: data?.quote ?? null, error: resource.error, isLoading: resource.isInitialLoading, retry }
}
