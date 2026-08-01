import { Section } from '@moc/ui/components/display/section'
import { Label } from '@moc/ui/components/display/text'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { GROUP_MESSAGE_TYPES, DM_MESSAGE_TYPES } from './meta'
import { MessageTemplateRow } from './message-template-row'
import { useMessageTemplates } from './use-message-templates'

export function MessageTemplates() {
    const { state } = useMessageTemplates()
    if (!state.hasWorkspace) return null

    return (
        <Section>
            <Section.Header title="Message templates" />
            {state.isLoading ? <div className="flex justify-center py-6"><LoadingSpinner size="lg" /></div> : (
                <Section.Body className="gap-6">
                    <div className="flex flex-col">
                        <Label.sm className="px-3 pb-2 text-tertiary">Group and topic events</Label.sm>
                        {GROUP_MESSAGE_TYPES.map((type) => <MessageTemplateRow key={type} type={type} customised={state.customised.has(type)} />)}
                    </div>
                    <div className="flex flex-col">
                        <Label.sm className="px-3 pb-2 text-tertiary">Direct messages</Label.sm>
                        {DM_MESSAGE_TYPES.map((type) => <MessageTemplateRow key={type} type={type} customised={state.customised.has(type)} />)}
                    </div>
                </Section.Body>
            )}
        </Section>
    )
}
