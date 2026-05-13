import { Badge } from "@/components/display/badge";
import { Card } from "@/components/display/card";
import { Section } from "@/components/display/section";
import { Paragraph, Label } from "@/components/display/text";
import { LoadingSpinner } from "@/components/feedback/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useWorkspace } from "@/lib/workspace-context";
import {
    fetchTelegramGroups,
    setTelegramGroupActive,
    type TelegramGroup,
} from "@/data/fetch-telegram-groups";
import { MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Divider } from "@/components/display/divider";
import { Decision } from "@/components/display/decision";
import { Toggle } from "@/components/form/toggle";

export function TelegramTab() {
    const { toast } = useFeedback();
    const { currentWorkspaceId, workspaces } = useWorkspace();

    const [groups, setGroups] = useState<TelegramGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingChatId, setPendingChatId] = useState<string | null>(null);

    const loadGroups = useCallback(async () => {
        if (!currentWorkspaceId) {
            setGroups([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await fetchTelegramGroups(currentWorkspaceId);
            setGroups(data);
        } catch (error) {
            toast({
                title: "Couldn't load Telegram groups",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspaceId, toast]);

    useEffect(() => {
        void loadGroups();
    }, [loadGroups]);

    const currentWorkspaceSlug = workspaces.find((w) => w.id === currentWorkspaceId)?.slug;

    const handleToggleActive = useCallback(
        (chatId: string) => async (next: boolean) => {
            setPendingChatId(chatId);
            setGroups((prev) => prev.map((g) => (g.chatId === chatId ? { ...g, active: next } : g)));
            try {
                await setTelegramGroupActive(chatId, next);
            } catch (error) {
                setGroups((prev) => prev.map((g) => (g.chatId === chatId ? { ...g, active: !next } : g)));
                toast({
                    title: "Couldn't update group",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "error",
                });
            } finally {
                setPendingChatId(null);
            }
        },
        [toast],
    );

    return (
        <Section>
            <Section.Header title="Telegram groups" />

            <Divider className="py-6" />

            <Section.Body className="gap-4">
                <Decision value={groups} loading={isLoading}>
                    <Decision.Loading>
                        <LoadingSpinner size="lg" />
                    </Decision.Loading>
                    <Decision.Empty>
                        <EmptyState
                            icon={<MessagesSquare />}
                            title="No groups yet"
                            description={
                                currentWorkspaceSlug
                                    ? `Add the bot to a Telegram group, then send "/register_group ${currentWorkspaceSlug}" in that group to register it to this workspace.`
                                    : "Add the bot to a Telegram group, then send /register_group <workspace-slug> in that group."
                            }
                        />
                    </Decision.Empty>
                    <Decision.Data>
                        {groups.map((group) => (
                            <Card key={group.chatId}>
                                <Card.Header tight>
                                    <div className="flex flex-1 flex-col gap-1">
                                        <Label.md>{group.title || "(untitled)"}</Label.md>
                                        <Paragraph.xs className="text-quaternary">
                                            chat id {group.chatId}
                                        </Paragraph.xs>
                                    </div>
                                    <Toggle
                                        checked={group.active}
                                        disabled={pendingChatId === group.chatId}
                                        onChange={handleToggleActive(group.chatId)}
                                    />

                                </Card.Header>
                                {group.topics.length > 0 && (
                                    <Card.Content className="flex flex-col">
                                        {group.topics.map((topic) => (
                                            <div
                                                key={topic.threadId}
                                                className="flex items-center justify-between px-3 py-2 border-b border-tertiary last:border-b-0"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Label.sm>{topic.name || "(unnamed)"}</Label.sm>
                                                    <Paragraph.xs className="text-quaternary">#{topic.threadId}</Paragraph.xs>
                                                </div>
                                                {topic.closed && <Badge label="closed" color="gray" variant="outline" />}
                                            </div>
                                        ))}
                                    </Card.Content>
                                )}
                            </Card>
                        ))}
                    </Decision.Data>
                </Decision>
            </Section.Body>
        </Section>
    );
}
