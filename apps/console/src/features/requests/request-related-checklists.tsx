import type { RequestRelatedChecklist } from "@/data/fetch-request-related-checklists";
import { routes } from "@/screens/console-routes";
import { Button } from "@moc/ui/components/controls/button";
import { Card } from "@moc/ui/components/display/card";
import { Section } from "@moc/ui/components/display/section";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Alert } from "@moc/ui/components/feedback/alert";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { CheckCircle2, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";

type RequestRelatedChecklistsProps = {
  checklists: RequestRelatedChecklist[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function RequestRelatedChecklists({ checklists, isLoading, error, onRetry }: RequestRelatedChecklistsProps) {
  function renderChecklist(checklist: RequestRelatedChecklist) {
    return <RelatedChecklistItem key={checklist.id} checklist={checklist} />;
  }

  if (isLoading) return <LoadingSpinner className="py-6" />;

  return (
    <Section>
      <Section.Header title="Related checklists" />
      <Section.Body className="gap-2">
        {error && <RelatedChecklistError description={error} onRetry={onRetry} />}
        {!error && (checklists.length ? checklists.map(renderChecklist) : <Paragraph.sm className="text-tertiary">No checklist is linked to this request.</Paragraph.sm>)}
      </Section.Body>
    </Section>
  );
}

function RelatedChecklistItem({ checklist }: { checklist: RequestRelatedChecklist }) {
  const isComplete = checklist.totalItems > 0 && checklist.completedItems === checklist.totalItems;
  const progress = `${checklist.completedItems} of ${checklist.totalItems} complete`;

  return (
    <Link to={`/${routes.checklists}/${checklist.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-border-brand/10">
      <Card>
        <Card.Content className="p-3">
          <div className="flex min-w-0 items-center gap-2">
            {isComplete ? <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" /> : <ListChecks aria-hidden="true" className="size-4 shrink-0 text-tertiary" />}
            <div className="min-w-0 flex-1">
              <Label.sm className="block truncate">{checklist.name}</Label.sm>
              <Paragraph.xs className={isComplete ? "text-success" : "text-tertiary"}>{progress}</Paragraph.xs>
            </div>
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}

function RelatedChecklistError({ description, onRetry }: { description: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Alert title="Couldn’t load related checklists" description={description} variant="error" style="outline" className="flex-1" />
      <Button variant="secondary" onClick={onRetry}>Retry</Button>
    </div>
  );
}
