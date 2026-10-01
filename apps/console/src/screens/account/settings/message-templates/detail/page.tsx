import { Navigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/lib/workspace-context";
import { routes } from "@/screens/console-routes";
import { isMessageType } from "../meta";
import { MessageTemplateEditor } from "./message-template-editor";

const SETTINGS_TELEGRAM = `/${routes.settings}?tab=telegram`;

export function MessageTemplateDetailScreen() {
    const { messageType: raw } = useParams<{ messageType: string }>();
    const { role } = useWorkspace();
    const canManage = role?.can_manage_roles === true;
    if (!raw || !isMessageType(raw) || !canManage) return <Navigate to={SETTINGS_TELEGRAM} replace />;
    return <MessageTemplateEditor key={raw} messageType={raw} />;
}
