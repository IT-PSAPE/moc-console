import { createContext, useContext, type ReactNode } from 'react'
import { useTelegramPage } from './use-telegram-page'

type TelegramContextValue = ReturnType<typeof useTelegramPage>
const TelegramContext = createContext<TelegramContextValue | null>(null)

export function TelegramProvider({ children }: { children: ReactNode }) {
  const value = useTelegramPage()
  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
}

export function useTelegramContext() {
  const context = useContext(TelegramContext)
  if (!context) throw new Error('Telegram components must be within TelegramProvider')
  return context
}
