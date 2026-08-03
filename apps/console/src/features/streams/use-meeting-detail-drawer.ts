import { useNavigate } from "react-router-dom";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useAuth } from "@/lib/auth-context";
import { routes } from "@/screens/console-routes";
import type { ZoomMeeting } from "@moc/types/streams/zoom";

type DrawerField = "join" | "pass";

export function useMeetingDetailDrawer(meeting: ZoomMeeting | null, onClose: () => void, onEdit?: (meeting: ZoomMeeting) => void, onDelete?: (meeting: ZoomMeeting) => void) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const copied = useCopyFeedback<DrawerField>();

  function close() { onClose(); }
  function openFullPage() {
    if (!meeting) return;
    close();
    navigate(`/${routes.meetingDetail.replace(":id", meeting.id)}`);
  }
  function edit() { if (meeting) onEdit?.(meeting); }
  function remove() { if (meeting) onDelete?.(meeting); }
  function copyJoinUrl() { copied.actions.copy(meeting?.joinUrl, "join"); }
  function copyPassword() { copied.actions.copy(meeting?.password, "pass"); }

  return {
    state: copied.state,
    actions: { close, copyJoinUrl, copyPassword, edit, openFullPage, remove },
    meta: { canDelete: role?.can_delete === true, canEdit: role?.can_update === true },
  };
}
