import { Button } from '@moc/ui/components/controls/button'
import { Section } from '@moc/ui/components/display/section'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import type { CommentView } from './discussion-types'
import { ItemCommentRow } from './item-comment-row'
import { ItemCommentComposer } from './item-comment-composer'
import { useItemDiscussionContext } from './item-discussion-context'

export function ItemComments() {
    const { state, actions, meta: { canComment, commentsScrollRef } } = useItemDiscussionContext()

    function renderComment(comment: CommentView) { return <ItemCommentRow key={comment.id} comment={comment} /> }

    return (
        <Section.Body className="max-h-[min(34rem,70dvh)] min-h-52">
            <ScrollArea className="min-h-0 flex-1">
                <ScrollArea.Viewport ref={commentsScrollRef} className="max-h-[min(24rem,48dvh)]">
                    <ScrollArea.Content>
                        <Section.Body className="gap-5 pr-2 pb-4" aria-label="Comments">
                            {state.commentsLoading && <LoadingSpinner className="py-6" />}
                            {state.commentsError && <RetryNotification title="Couldn’t load comments" description={state.commentsError} onRetry={actions.refreshComments} isRetrying={state.commentsFetching} />}
                            {!state.commentsLoading && state.commentsError && !state.comments.length && <EmptyState title="Comments couldn't be loaded" description={state.commentsError} action={<Button variant="secondary" onClick={actions.refreshComments} disabled={state.commentsFetching}>Retry</Button>} />}
                            {state.hasOlderComments && <Button variant="ghost" size="sm" className="self-start" onClick={actions.loadOlderComments} disabled={state.commentsFetching}>{state.commentsFetching ? 'Loading…' : 'Load older comments'}</Button>}
                            {state.comments.map(renderComment)}
                        </Section.Body>
                    </ScrollArea.Content>
                </ScrollArea.Viewport>
            </ScrollArea>
            {canComment && <Section className="sticky bottom-0 z-10 shrink-0 bg-primary pt-2"><ItemCommentComposer /></Section>}
        </Section.Body>
    )
}
