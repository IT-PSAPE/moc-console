import { Alert } from "@moc/ui/components/feedback/alert";
import { Button } from "@moc/ui/components/controls/button";
import { Card } from "@moc/ui/components/display/card";
import { Section } from "@moc/ui/components/display/section";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { TextArea } from "@moc/ui/components/form/text-area";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import type { RequestActivity, RequestComment } from "@moc/types/requests";
import { MessageSquareText } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import { formatRequestActivity, formatRequestActor, formatRequestHistoryTimestamp } from "./request-discussion-formatters";
import { useRequestDiscussion } from "./use-request-discussion";

type RequestDiscussionRootProps = {
  children: ReactNode;
  requestId: string;
  refreshKey?: string;
  enabled?: boolean;
};

type RequestDiscussionContextValue = ReturnType<typeof useRequestDiscussion>;

const RequestDiscussionContext = createContext<RequestDiscussionContextValue | null>(null);

function Root({ children, requestId, refreshKey, enabled = true }: RequestDiscussionRootProps) {
  const value = useRequestDiscussion(requestId, enabled, refreshKey);
  return <RequestDiscussionContext value={value}>{children}</RequestDiscussionContext>;
}

function Activity() {
  const { state, actions } = useRequestDiscussionContext();

  function renderActivity(activity: RequestActivity) {
    const copy = formatRequestActivity(activity);
    return <ActivityItem key={activity.id} activity={activity} title={copy.title} description={copy.description} />;
  }

  if (state.isLoading) {
    return <LoadingSpinner className="py-6" />;
  }

  if (state.loadError) {
    return <DiscussionError title="Couldn’t load request discussion" description={state.loadError} onRetry={actions.refresh} />;
  }

  return (
    <Section>
      <Section.Header title="Activity" />
      <Section.Body className="gap-2">
        {state.activity.length ? state.activity.map(renderActivity) : <Paragraph.sm className="text-tertiary">No activity yet.</Paragraph.sm>}
      </Section.Body>
    </Section>
  );
}

function Comments() {
  const { state, actions } = useRequestDiscussionContext();

  function renderComment(comment: RequestComment) {
    return <CommentItem key={comment.id} comment={comment} />;
  }

  if (state.isLoading) {
    return null;
  }

  if (state.loadError) {
    return null;
  }

  return (
    <Section>
      <Section.Header title="Comments" />
      <Section.Body className="gap-3">
        <TextArea aria-label="Add a comment" name="request-comment" placeholder="Add a comment…" value={state.commentDraft} onChange={actions.changeCommentDraft} rows={3} />
        {state.submitError && <DiscussionError title="Couldn’t add comment" description={state.submitError} onRetry={actions.submitComment} />}
        <Button className="self-end" onClick={actions.submitComment} disabled={!state.commentDraft.trim() || state.isSubmitting}>
          {state.isSubmitting ? "Adding…" : "Add comment"}
        </Button>
        <div className="flex flex-col gap-2">
          {state.comments.length ? state.comments.map(renderComment) : <Paragraph.sm className="text-tertiary">No comments yet.</Paragraph.sm>}
        </div>
      </Section.Body>
    </Section>
  );
}

function ActivityItem({ activity, title, description }: { activity: RequestActivity; title: string; description: string | null }) {
  return (
    <Card>
      <Card.Content className="p-3">
        <div className="flex min-w-0 items-start gap-2">
          <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Label.sm>{title}</Label.sm>
              <Paragraph.xs className="text-quaternary">{formatRequestHistoryTimestamp(activity.createdAt)}</Paragraph.xs>
            </div>
            <Paragraph.xs className="text-tertiary">{formatRequestActor(activity.actor)}</Paragraph.xs>
            {description && <Paragraph.sm className="pt-1 text-secondary">{description}</Paragraph.sm>}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

function CommentItem({ comment }: { comment: RequestComment }) {
  const avatar = comment.actor ? <UserAvatar size="sm" user={comment.actor} /> : <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary" />;

  return (
    <Card>
      <Card.Content className="p-3">
        <div className="flex min-w-0 items-start gap-2">
          {avatar}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Label.sm>{formatRequestActor(comment.actor)}</Label.sm>
              <Paragraph.xs className="text-quaternary">{formatRequestHistoryTimestamp(comment.createdAt)}</Paragraph.xs>
            </div>
            <Paragraph.sm className="whitespace-pre-wrap break-words pt-1 text-secondary">{comment.body}</Paragraph.sm>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

function DiscussionError({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Alert title={title} description={description} variant="error" style="outline" className="flex-1" />
      <Button variant="secondary" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function useRequestDiscussionContext() {
  const context = useContext(RequestDiscussionContext);
  if (!context) throw new Error("RequestDiscussion components must be used within RequestDiscussion.Root.");
  return context;
}

export const RequestDiscussion = { Root, Activity, Comments };
