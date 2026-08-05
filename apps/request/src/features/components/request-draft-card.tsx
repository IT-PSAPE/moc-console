import { Button } from "@moc/ui/components/controls/button";
import { Card } from "@moc/ui/components/display/card";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";
import { FileClock } from "lucide-react";

type RequestDraftCardProps = {
  onContinue: () => void;
  discardOpen: boolean;
  onDiscardOpenChange: (open: boolean) => void;
  onRequestDiscard: () => void;
  onConfirmDiscard: () => void;
};

export function RequestDraftCard({ onContinue, discardOpen, onDiscardOpenChange, onRequestDiscard, onConfirmDiscard }: RequestDraftCardProps) {
  return (
    <Card>
      <Card.Header className="gap-2">
        <FileClock aria-hidden="true" className="size-4 text-brand" />
        <Label.md>Request draft saved</Label.md>
      </Card.Header>
      <Card.Content className="p-4">
        <div className="flex flex-col gap-4">
          <Paragraph.sm className="text-secondary">Continue where you left off or discard this draft and start again.</Paragraph.sm>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onContinue}>Continue submission</Button>
            <Button variant="secondary" onClick={onRequestDiscard}>Discard draft</Button>
          </div>
        </div>
      </Card.Content>
      <ConfirmationDialog
        open={discardOpen}
        onOpenChange={onDiscardOpenChange}
        title="Discard request draft?"
        description="This will permanently remove the saved request draft from this device."
        confirmLabel="Discard draft"
        onConfirm={onConfirmDiscard}
      />
    </Card>
  );
}
