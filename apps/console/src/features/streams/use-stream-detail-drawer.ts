import { useNavigate } from "react-router-dom";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useAuth } from "@/lib/auth-context";
import { routes } from "@/screens/console-routes";
import type { Stream } from "@moc/types/streams/stream";

type DrawerField = "url" | "key" | "ingestion";

export function useStreamDetailDrawer(stream: Stream | null, onClose: () => void, onEdit?: (stream: Stream) => void, onDelete?: (stream: Stream) => void) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const copied = useCopyFeedback<DrawerField>();

  function close() { onClose(); }
  function openFullPage() {
    if (!stream) return;
    close();
    navigate(`/${routes.streamDetail.replace(":id", stream.id)}`);
  }
  function edit() { if (stream) onEdit?.(stream); }
  function remove() { if (stream) onDelete?.(stream); }
  function copyUrl() { copied.actions.copy(stream?.streamUrl, "url"); }
  function copyKey() { copied.actions.copy(stream?.streamKey, "key"); }
  function copyIngestionUrl() { copied.actions.copy(stream?.ingestionUrl, "ingestion"); }

  return {
    state: copied.state,
    actions: { close, copyIngestionUrl, copyKey, copyUrl, edit, openFullPage, remove },
    meta: { canDelete: role?.can_delete === true, canEdit: role?.can_update === true, canViewStreamKey: role?.can_create === true },
  };
}
