import { ScheduledMessageBodyContext, type ScheduledMessageBodyRootProps } from './scheduled-message-body-context'
import { useScheduledMessageBody } from '../use-scheduled-message-body'

export function ScheduledMessageBodyRoot({ body, onChange, primaryPreview, followUpPreview, timezone, children }: ScheduledMessageBodyRootProps) {
    const value = useScheduledMessageBody(body, onChange, primaryPreview, followUpPreview, timezone)
    return <ScheduledMessageBodyContext.Provider value={value}>{children}</ScheduledMessageBodyContext.Provider>
}
