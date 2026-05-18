import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Section } from "@moc/ui/components/display/section";
import { Divider } from "@moc/ui/components/display/divider";
import { Paragraph, Label } from "@moc/ui/components/display/text";
import { Badge } from "@moc/ui/components/display/badge";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { ChevronRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { routes } from "@/screens/console-routes";
import type { MessageType } from "@/data/notification-templates-core";
import { fetchNotificationTemplates } from "@/data/notification-templates";
import { GROUP_MESSAGE_TYPES, DM_MESSAGE_TYPES, messageTypeMeta } from "./meta";

function detailPath(type: MessageType): string {
    return `/${routes.messageTemplateDetail.replace(":messageType", encodeURIComponent(type))}`;
}

function TemplateRow({
    type,
    customised,
    onOpen,
}: {
    type: MessageType;
    customised: boolean;
    onOpen: () => void;
}) {
    const meta = messageTypeMeta(type);
    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left border-b border-tertiary last:border-b-0 hover:bg-secondary"
        >
            <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <Label.sm>{meta.label}</Label.sm>
                    {customised && <Badge label="Customised" color="blue" variant="outline" />}
                </div>
                <Paragraph.xs className="text-quaternary">{meta.description}</Paragraph.xs>
            </div>
            <ChevronRight className="size-4 shrink-0 text-quaternary" />
        </button>
    );
}

export function MessageTemplates() {
    const { toast } = useFeedback();
    const navigate = useNavigate();
    const { currentWorkspaceId } = useWorkspace();
    const [isLoading, setIsLoading] = useState(true);
    const [customised, setCustomised] = useState<Set<MessageType>>(new Set());

    useEffect(() => {
        if (!currentWorkspaceId) {
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        void (async () => {
            try {
                const rows = await fetchNotificationTemplates(currentWorkspaceId);
                if (!cancelled) setCustomised(new Set(rows.map((r) => r.messageType)));
            } catch (error) {
                if (!cancelled) {
                    toast({
                        title: "Couldn't load message templates",
                        description: error instanceof Error ? error.message : "Unknown error",
                        variant: "error",
                    });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentWorkspaceId, toast]);

    if (!currentWorkspaceId) return null;

    return (
        <Section>
            <Section.Header
                title="Message templates"
                description="Customise the text of Telegram notifications. Click a message to edit its template; leave it untouched to keep the built-in wording."
            />
            <Divider className="py-6" />
            {isLoading ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="lg" />
                </div>
            ) : (
                <Section.Body className="gap-6">
                    <div className="flex flex-col">
                        <Label.sm className="px-3 pb-2 text-tertiary">Group &amp; topic events</Label.sm>
                        {GROUP_MESSAGE_TYPES.map((type) => (
                            <TemplateRow
                                key={type}
                                type={type}
                                customised={customised.has(type)}
                                onOpen={() => navigate(detailPath(type))}
                            />
                        ))}
                    </div>
                    <div className="flex flex-col">
                        <Label.sm className="px-3 pb-2 text-tertiary">
                            Direct messages (assignments)
                        </Label.sm>
                        {DM_MESSAGE_TYPES.map((type) => (
                            <TemplateRow
                                key={type}
                                type={type}
                                customised={customised.has(type)}
                                onOpen={() => navigate(detailPath(type))}
                            />
                        ))}
                    </div>
                </Section.Body>
            )}
        </Section>
    );
}
