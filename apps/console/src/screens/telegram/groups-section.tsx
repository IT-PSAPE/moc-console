import { Button } from "@moc/ui/components/controls/button";
import { Section } from "@moc/ui/components/display/section";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { RetryNotification } from "@moc/ui/components/feedback/retry-notification";
import { MessagesSquare } from "lucide-react";
import { Decision } from "@moc/ui/components/display/decision";
import type { TelegramGroup } from "@/data/fetch-telegram-groups";
import { useTelegramContext } from "./telegram-context";
import { TelegramGroupCard } from "./telegram-group-card";

export function TelegramGroupsSection() {
    const { state, actions } = useTelegramContext();

    function renderGroup(group: TelegramGroup) {
        return (
            <TelegramGroupCard
                key={group.chatId}
                group={group}
                pendingChatId={state.pendingChatId}
                onOpenConnect={actions.openGroupConnect}
                onToggleGroup={actions.toggleGroup}
            />
        );
    }

    return (
        <Section>
            <Section.Header title="Telegram groups" description="Choose which events reach each group or topic. Newly registered groups start paused." />

            <Section.Body className="gap-4">
                {state.groupsError ? (
                    <>
                        <RetryNotification title="Telegram settings couldn't be loaded" description={state.groupsError.message} onRetry={actions.loadGroups} isRetrying={state.isGroupsLoading} />
                        {state.groups.length > 0 ? state.groups.map(renderGroup) : <EmptyState icon={<MessagesSquare />} title="Telegram groups couldn't be loaded" description={state.groupsError.message} action={<Button variant="secondary" onClick={actions.loadGroups} disabled={state.isGroupsLoading}>Retry</Button>} />}
                    </>
                ) : (
                    <Decision value={state.groups} loading={state.isGroupsLoading}>
                        <Decision.Loading>
                            <LoadingSpinner size="lg" />
                        </Decision.Loading>
                        <Decision.Empty>
                            <EmptyState
                                icon={<MessagesSquare />}
                                title="No groups yet"
                                description="Groups connected in Telegram appear here."
                            />
                        </Decision.Empty>
                        <Decision.Data>
                            {state.groups.map(renderGroup)}
                        </Decision.Data>
                    </Decision>
                )}
            </Section.Body>
        </Section>
    );
}
