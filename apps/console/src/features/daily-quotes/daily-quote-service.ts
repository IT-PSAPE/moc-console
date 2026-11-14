import type { DailyQuote, DailyQuoteDraft, DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import { moc } from '@/lib/moc-client'

export function fetchDailyQuotes(workspaceId: string): Promise<DailyQuote[]> {
  return moc.dailyQuotes.list(workspaceId)
}

export function fetchDailyQuote(workspaceId: string): Promise<DailyQuoteSelection> {
  return moc.dailyQuotes.getDaily(workspaceId)
}

export function saveDailyQuote(draft: DailyQuoteDraft, workspaceId: string): Promise<DailyQuote> {
  return moc.dailyQuotes.save(draft, workspaceId)
}

export async function uploadDailyQuoteImage(file: File, workspaceId: string, signal: AbortSignal): Promise<string> {
  const image = await moc.storage.upload({ purpose: 'quote-image', workspaceId, file, signal })
  return image.path
}

export function changeDailyQuoteActive(id: string, active: boolean, workspaceId: string): Promise<DailyQuote> {
  return moc.dailyQuotes.setActive(id, active, workspaceId)
}

export function setTodayDailyQuote(id: string | null, workspaceId: string): Promise<DailyQuoteSelection> {
  return moc.dailyQuotes.setToday(id, workspaceId)
}
