import { Button } from "@moc/ui/components/controls/button";
import { DividedList } from "@moc/ui/components/display/divided-list";
import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { Section } from "@moc/ui/components/display/section";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { TextArea } from "@moc/ui/components/form/text-area";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert";
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
    return <RetryAlert title="Couldn’t load request discussion" description={state.loadError} onRetry={actions.refresh} />;
  }

  return (
    <Section>
      <Label.sm className="block pb-3 text-primary">Activity</Label.sm>
      <Section.Body className="gap-3">
        {state.activity.length ? <DividedList>{state.activity.map(renderActivity)}</DividedList> : <Paragraph.sm className="text-tertiary">No activity yet.</Paragraph.sm>}
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
      <Label.sm className="block pb-3 text-primary">Comments</Label.sm>
      <Section.Body className="gap-3">
        <TextArea aria-label="Add a comment" name="request-comment" placeholder="Add a comment…" value={state.commentDraft} onChange={actions.changeCommentDraft} rows={3} />
        {state.submitError && <RetryAlert title="Couldn’t add comment" description={state.submitError} onRetry={actions.submitComment} />}
        <Button size="sm" className="self-end" onClick={actions.submitComment} disabled={!state.commentDraft.trim() || state.isSubmitting}>
          {state.isSubmitting ? "Adding…" : "Add comment"}
        </Button>
        {state.comments.length ? <DividedList>{state.comments.map(renderComment)}</DividedList> : <Paragraph.sm className="text-tertiary">No comments yet.</Paragraph.sm>}
      </Section.Body>
    </Section>
  );
}

function ActivityItem({ activity, title, description }: { activity: RequestActivity; title: string; description: string | null }) {
  return (
    <ListItemCard.Root className="items-start">
      <ListItemCard.Leading><MessageSquareText aria-hidden="true" /></ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{title}</ListItemCard.Title>
        <ListItemCard.Subtitle>{formatRequestActor(activity.actor)}</ListItemCard.Subtitle>
        {description && <Paragraph.sm className="pt-1 text-secondary">{description}</Paragraph.sm>}
      </ListItemCard.Content>
      <ListItemCard.Trailing>
        <Paragraph.xs className="text-tertiary">{formatRequestHistoryTimestamp(activity.createdAt)}</Paragraph.xs>
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  );
}

function CommentItem({ comment }: { comment: RequestComment }) {
  return (
    <ListItemCard.Root className="items-start">
      <ListItemCard.Leading>
        {comment.actor ? <UserAvatar size="sm" user={comment.actor} /> : <MessageSquareText aria-hidden="true" />}
      </ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{formatRequestActor(comment.actor)}</ListItemCard.Title>
        <Paragraph.sm className="whitespace-pre-wrap break-words pt-1 text-secondary">{comment.body}</Paragraph.sm>
      </ListItemCard.Content>
      <ListItemCard.Trailing>
        <Paragraph.xs className="text-tertiary">{formatRequestHistoryTimestamp(comment.createdAt)}</Paragraph.xs>
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  );
}

function useRequestDiscussionContext() {
  const context = useContext(RequestDiscussionContext);
  if (!context) throw new Error("RequestDiscussion components must be used within RequestDiscussion.Root.");
  return context;
}

export const RequestDiscussion = { Root, Activity, Comments };
