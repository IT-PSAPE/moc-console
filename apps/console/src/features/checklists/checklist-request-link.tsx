import { Link2, Unlink } from "lucide-react";
import { Link } from "react-router-dom";
import { routes } from "@/screens/console-routes";
import { Button } from "@moc/ui/components/controls/button";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Combobox } from "@moc/ui/components/form/combobox";
import type { Request } from "@moc/types/requests";

type ChecklistRequestLinkProps = {
  linkedRequest: Request | null;
  requests: Request[];
  isLoading: boolean;
  onLink: (request: Request) => void;
  onUnlink: () => void;
};

function requestLabel(request: Request) {
  return request.title;
}

export function ChecklistRequestLink({ linkedRequest, requests, isLoading, onLink, onUnlink }: ChecklistRequestLinkProps) {
  function handleSelect(request: Request | null) {
    if (request) onLink(request);
  }

  if (linkedRequest) {
    return (
      <MetaRow icon={<Link2 />} label="Request">
        <Button.Link render={<Link to={`/${routes.requests}/${linkedRequest.id}`} />} variant="ghost" className="min-w-0 flex-1 justify-start truncate px-0">{linkedRequest.title}</Button.Link>
        <Button.Icon aria-label="Unlink request" variant="ghost" icon={<Unlink />} onClick={onUnlink} />
      </MetaRow>
    );
  }

  return (
    <MetaRow icon={<Link2 />} label="Request">
      <Combobox.Root items={requests} value={null} onValueChange={handleSelect} itemToStringLabel={requestLabel}>
        <Combobox.Field aria-label="Link request" placeholder="Link a request…" disabled={isLoading} />
        <Combobox.Content empty={isLoading ? "Loading requests…" : "No requests found"} searchPlaceholder="Search requests" title="Link a request">
          {requests.map((request) => <Combobox.Item key={request.id} value={request}>{request.title}</Combobox.Item>)}
        </Combobox.Content>
      </Combobox.Root>
    </MetaRow>
  );
}
