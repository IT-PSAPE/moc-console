import { Section } from '@moc/ui/components/display/section'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RetryAlert } from '@moc/ui/components/feedback/retry-alert'
import { GROUP_MESSAGE_TYPES, DM_MESSAGE_TYPES } from './meta'
import type { MessageType } from '@moc/notifications'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { MessageTemplateRow } from './message-template-row'

import { useMessageTemplates } from './use-message-templates'

const MESSAGE_TYPES = [...GROUP_MESSAGE_TYPES, ...DM_MESSAGE_TYPES]

export function MessageTemplates() {
    const { state, actions } = useMessageTemplates()
    function renderTemplate(type: MessageType) {
        return <MessageTemplateRow key={type} type={type} customised={state.customised.has(type)} />
    }

    if (!state.hasWorkspace) return null

    return (
        <Section>
            <Section.Header title="Notifications" description="Customize Telegram notification templates." />
            {state.isLoading ? <div className="flex justify-center py-6"><LoadingSpinner size="lg" /></div> : state.loadError ? <RetryAlert title="Couldn't load message templates" description={state.loadError.message} onRetry={actions.retryLoad} isRetrying={state.isRetrying} /> : (
                <Section.Body className="gap-4">
                    <DividedList>{MESSAGE_TYPES.map(renderTemplate)}</DividedList>
                </Section.Body>
            )}
        </Section>
    )
}
