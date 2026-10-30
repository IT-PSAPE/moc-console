import { Button } from "@moc/ui/components/controls/button";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { RetryNotification } from "@moc/ui/components/feedback/retry-notification";

type ResourceLoadErrorProps = {
  error: Error | string;
  isRetrying?: boolean;
  onRetry: () => void;
  title: string;
};

export function ResourceLoadError({ error, isRetrying = false, onRetry, title }: ResourceLoadErrorProps) {
  const description = typeof error === 'string' ? error : error.message;
  return <>
    <RetryNotification title={title} description={description} onRetry={onRetry} isRetrying={isRetrying} />
    <EmptyState title={title} action={<Button variant="secondary" onClick={onRetry} disabled={isRetrying}>{isRetrying ? 'Retrying…' : 'Retry'}</Button>} />
  </>;
}
