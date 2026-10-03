import { createContext, useContext, type ReactNode } from 'react'
import { useScheduledTemplateEditor } from './use-scheduled-template-editor'
const Context = createContext<ReturnType<typeof useScheduledTemplateEditor> | null>(null)
export function ScheduledTemplateProvider({ children }: { children: ReactNode }) {
    const value = useScheduledTemplateEditor()
    return <Context value={value}>{children}</Context>
}
export function useScheduledTemplateContext() {
    const value = useContext(Context)
    if (!value) throw new Error('ScheduledTemplateProvider is required')
    return value
}
