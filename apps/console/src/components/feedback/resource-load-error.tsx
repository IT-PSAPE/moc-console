import { RetryAlert } from "@moc/ui/components/feedback/retry-alert";

type ResourceLoadErrorProps = {
  error: Error;
  onRetry: () => void;
  title: string;
};

export function ResourceLoadError({ error, onRetry, title }: ResourceLoadErrorProps) {
  return <RetryAlert title={title} description={error.message} onRetry={onRetry} />;
}
