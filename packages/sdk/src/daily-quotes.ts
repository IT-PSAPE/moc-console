import type { MocTransport } from "./transport"

export type DailyQuote = {
  id: string
  text: string
  attribution: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type DailyQuoteDraft = { id?: string; text: string; attribution?: string | null; active?: boolean }
export type DailyQuoteSelection = { quote: DailyQuote | null; date: string; timezone: string; overridden: boolean }

export function createDailyQuotesClient(transport: MocTransport) {
  return {
    list: (workspaceId: string) => transport.call<DailyQuote[]>("dailyQuotes", "list", undefined, workspaceId),
    getDaily: (workspaceId: string) => transport.call<DailyQuoteSelection>("dailyQuotes", "getDaily", undefined, workspaceId),
    setToday: (id: string | null, workspaceId: string) => transport.call<DailyQuoteSelection>("dailyQuotes", "setToday", { id }, workspaceId),
    save: (draft: DailyQuoteDraft, workspaceId: string) => transport.call<DailyQuote>("dailyQuotes", "save", draft, workspaceId),
    setActive: (id: string, active: boolean, workspaceId: string) => transport.call<DailyQuote>("dailyQuotes", "setActive", { id, active }, workspaceId),
  }
}
