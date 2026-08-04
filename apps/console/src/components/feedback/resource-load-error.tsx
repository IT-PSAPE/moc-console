import { Button } from "@moc/ui/components/controls/button";
import { Alert } from "@moc/ui/components/feedback/alert";

type ResourceLoadErrorProps = {
  error: Error;
  onRetry: () => void;
  title: string;
};

export function ResourceLoadError({ error, onRetry, title }: ResourceLoadErrorProps) {
  return <Alert variant="error" title={title} description={error.message} action={<Button variant="secondary" onClick={onRetry}>Retry</Button>} />;
}
