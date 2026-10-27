import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ScheduledMessagePreview } from '../scheduled-message-preview'

export type ScheduledMessageBodyContextValue = {
    state: { view: 'editor' | 'preview'; editorHtml: string; primaryPreview: ScheduledMessagePreview; followUpPreview: ScheduledMessagePreview | null }
    actions: { changeView: (value: string) => void; changeRichBody: (html: string) => void }
    meta: { timezone: string }
}

export const ScheduledMessageBodyContext = createContext<ScheduledMessageBodyContextValue | null>(null)

export function useScheduledMessageBodyContext(): ScheduledMessageBodyContextValue {
    const value = useContext(ScheduledMessageBodyContext)
    if (!value) throw new Error('ScheduledMessageBody.Root is required')
    return value
}

export type ScheduledMessageBodyRootProps = {
    body: string
    onChange: (body: string) => void
    primaryPreview: ScheduledMessagePreview
    followUpPreview: ScheduledMessagePreview | null
    timezone: string
    children: ReactNode
}
