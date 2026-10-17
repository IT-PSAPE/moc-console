import { Navigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/lib/workspace-context";
import { isMessageType, MESSAGE_TEMPLATES_PATH } from "../meta";
import { MessageTemplateEditor } from "./message-template-editor";

export function MessageTemplateDetailScreen() {
    const { messageType: raw } = useParams<{ messageType: string }>();
    const { role, currentWorkspaceId } = useWorkspace();
    const canManage = role?.can_manage_roles === true;
    if (!raw || !isMessageType(raw) || !canManage) return <Navigate to={MESSAGE_TEMPLATES_PATH} replace />;
    return <MessageTemplateEditor key={`${currentWorkspaceId ?? 'none'}:${raw}`} messageType={raw} />;
}
