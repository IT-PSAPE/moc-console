import { Section } from '@moc/ui/components/display/section'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { GROUP_MESSAGE_TYPES, DM_MESSAGE_TYPES } from './meta'
import { MessageTemplateGroup } from './message-template-group'
import { useMessageTemplates } from './use-message-templates'

export function MessageTemplates() {
    const { state } = useMessageTemplates()
    if (!state.hasWorkspace) return null

    return (
        <Section>
            <Section.Header title="Message templates" />
            {state.isLoading ? <div className="flex justify-center py-6"><LoadingSpinner size="lg" /></div> : (
                <Section.Body className="gap-4">
                    <MessageTemplateGroup title="Group and topic events" types={GROUP_MESSAGE_TYPES} customised={state.customised} />
                    <MessageTemplateGroup title="Direct messages" types={DM_MESSAGE_TYPES} customised={state.customised} />
                </Section.Body>
            )}
        </Section>
    )
}
