import { Badge } from "@/components/display/badge";
import { Card } from "@/components/display/card";
import { Header } from "@/components/display/header";
import { Paragraph, Title, Label } from "@/components/display/text";
import { Checkbox } from "@/components/form/checkbox";
import { Spinner } from "@/components/feedback/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useAuth } from "@/lib/auth-context";
import {
    fetchTelegramGroups,
    setTelegramGroupActive,
    type TelegramGroup,
} from "@/data/fetch-telegram-groups";
import { MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Navigate } from "react-router-dom";
import { routes } from "@/screens/console-routes";

export function TelegramGroupsScreen() {
    const { role } = useAuth();
    const { toast } = useFeedback();

    const [groups, setGroups] = useState<TelegramGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingChatId, setPendingChatId] = useState<string | null>(null);

    const loadGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchTelegramGroups();
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
    }, [toast]);

    useEffect(() => {
        void loadGroups();
    }, [loadGroups]);

    const handleToggleActive = useCallback(
        async (chatId: string, event: ChangeEvent<HTMLInputElement>) => {
            const next = event.target.checked;
            setPendingChatId(chatId);
            // optimistic
            setGroups((prev) => prev.map((g) => (g.chatId === chatId ? { ...g, active: next } : g)));
            try {
                await setTelegramGroupActive(chatId, next);
            } catch (error) {
                // rollback
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

    if (!role?.can_manage_roles && role !== null) {
        return <Navigate to={`/${routes.dashboard}`} replace />;
    }

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Telegram Groups</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Groups the bot has been added to. Toggle a group active to allow the app to send event notifications there. Forum topics are listed under each group.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                ) : groups.length === 0 ? (
                    <EmptyState
                        icon={<MessagesSquare />}
                        title="No groups yet"
                        description="Add the bot to a Telegram group or supergroup. It will appear here automatically."
                    />
                ) : (
                    groups.map((group) => (
                        <Card.Root key={group.chatId}>
                            <Card.Header>
                                <div className="flex flex-1 flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Label.md>{group.title || "(untitled)"}</Label.md>
                                        <Badge label={group.type} color="gray" variant="outline" />
                                        {group.isForum && <Badge label="forum" color="purple" />}
                                    </div>
                                    <Paragraph.xs className="text-quaternary">
                                        chat id {group.chatId}
                                    </Paragraph.xs>
                                </div>
                                <Checkbox
                                    checked={group.active}
                                    disabled={pendingChatId === group.chatId}
                                    onChange={(event) => void handleToggleActive(group.chatId, event)}
                                >
                                    <Label.sm>Active</Label.sm>
                                </Checkbox>
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
                        </Card.Root>
                    ))
                )}
            </div>
        </section>
    );
}
