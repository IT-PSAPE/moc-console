import { Button } from "@moc/ui/components/controls/button";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";

type ResourceLoadErrorProps = {
  error: Error | string;
  isRetrying?: boolean;
  onRetry: () => void;
  title: string;
};

export function ResourceLoadError({ error, isRetrying = false, onRetry, title }: ResourceLoadErrorProps) {
  const description = typeof error === 'string' ? error : error.message;
  return <EmptyState role="alert" title={title} description={description} action={<Button variant="secondary" onClick={onRetry} disabled={isRetrying} aria-busy={isRetrying || undefined}>{isRetrying ? 'Retrying…' : 'Retry'}</Button>} />;
}
