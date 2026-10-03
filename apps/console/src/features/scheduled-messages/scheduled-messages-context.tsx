import { createContext, useContext, type ReactNode } from 'react'
import { useScheduledMessages } from './use-scheduled-messages'
const Context=createContext<ReturnType<typeof useScheduledMessages>|null>(null)
export function ScheduledMessagesRoot({children}:{children:ReactNode}) {
  const value=useScheduledMessages()
  return <Context value={value}>{children}</Context>
}
export function useScheduledMessagesContext() {
  const value=useContext(Context)
  if(!value) throw new Error('ScheduledMessages.Root is required')
  return value
}
