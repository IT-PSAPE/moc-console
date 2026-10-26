import { Paragraph } from '@moc/ui/components/display/text'
import { Section } from '@moc/ui/components/display/section'
import { Composer } from '@moc/ui/components/form/composer'
import { RetryAlert } from '@moc/ui/components/feedback/retry-alert'
import { Send } from 'lucide-react'
import { useItemDiscussionContext } from './item-discussion-context'

export function ItemCommentComposer() {
    const { state, actions } = useItemDiscussionContext()
    return (
        <Section.Body className="gap-3">
            {state.submitError && <RetryAlert title="Couldn’t send comment" description={state.submitError} onRetry={actions.submitComment} isRetrying={state.isSubmitting} />}
            <Composer.Root aria-label="Write a comment" value={state.draft} onValueChange={actions.changeDraft} onSubmit={actions.submitComment} pending={state.isSubmitting} maxLength={10_000}>
                <Composer.Input aria-label="Comment" name="item-comment" placeholder="Write a comment…" />
                <Composer.Footer><Paragraph.xs className="text-quaternary portrait:hidden">Ctrl / ⌘ + Enter to send</Paragraph.xs><Composer.Submit pendingLabel="Sending…" icon={<Send />} className="ml-auto">Send</Composer.Submit></Composer.Footer>
            </Composer.Root>
        </Section.Body>
    )
}
