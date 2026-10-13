import { Section } from "@moc/ui/components/display/section";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert";
import { Button } from "@moc/ui/components/controls/button";
import { Paragraph } from "@moc/ui/components/display/text";
import { Copy, MessagesSquare } from "lucide-react";
import { Decision } from "@moc/ui/components/display/decision";
import type { TelegramGroup } from "@/data/fetch-telegram-groups";
import { ConnectEventsModal } from "@/features/notifications/connect-events-modal";
import { MessageTemplates } from "./message-templates/list";
import { useTelegramSettings } from "./use-telegram-settings";
import { TelegramGroupCard } from "./telegram-group-card";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";

export function TelegramTab() {
    const { state, actions } = useTelegramSettings();
    const copyFeedback = useCopyFeedback<"group" | "topic">();
    const groupCommand = state.currentWorkspaceSlug ? `/register_group ${state.currentWorkspaceSlug}` : null;
    const topicCommand = state.currentWorkspaceSlug ? `/register_topic ${state.currentWorkspaceSlug}` : null;

    function handleCopyGroupCommand() {
        void copyFeedback.actions.copy(groupCommand, "group");
    }

    function handleCopyTopicCommand() {
        void copyFeedback.actions.copy(topicCommand, "topic");
    }

    function renderGroup(group: TelegramGroup) {
        return (
            <TelegramGroupCard
                key={group.chatId}
                group={group}
                pendingChatId={state.pendingChatId}
                onOpenConnect={actions.openConnect}
                onToggleGroup={actions.toggleGroup}
            />
        );
    }

    return (
        <div className="flex flex-col gap-10">
            <Section>
                <Section.Header title="Telegram groups" description="Choose which events reach each group or topic. Newly registered groups start paused." />

                <Section.Body className="gap-4">
                    <div className="flex flex-col gap-3">
                        <Paragraph.sm className="text-secondary">
                            {state.currentWorkspaceSlug
                                ? `Connect your Telegram account in your Console profile, then add the bot to a group. As a workspace Admin, send ${groupCommand} there, or send ${topicCommand} from inside a forum topic. The topic command also registers its group.`
                                : "Connect your Telegram account in your Console profile, then add the bot to a group. As a workspace Admin, send /register_group <workspace-slug> there. To register a topic, send /register_topic <workspace-slug> from inside it; that also registers its group."}
                        </Paragraph.sm>
                        {groupCommand && topicCommand ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button variant="secondary" icon={<Copy />} onClick={handleCopyGroupCommand}>
                                    {copyFeedback.state.copiedField === "group" ? "Copied group command" : "Copy group command"}
                                </Button>
                                <Button variant="secondary" icon={<Copy />} onClick={handleCopyTopicCommand}>
                                    {copyFeedback.state.copiedField === "topic" ? "Copied topic command" : "Copy topic command"}
                                </Button>
                            </div>
                        ) : null}
                        {copyFeedback.state.copyMessage && <Paragraph.xs role="status" aria-live="polite" className="text-tertiary">{copyFeedback.state.copyMessage}</Paragraph.xs>}
                        <Paragraph.xs className="text-tertiary">After registering, turn on the group and connect the events it should receive.</Paragraph.xs>
                    </div>
                    {state.loadError ? (
                        <>
                            <RetryAlert title="Telegram settings couldn't be loaded" description="Check your connection and try again. Your existing group settings are unchanged." onRetry={actions.loadGroups} isRetrying={state.isLoading} />
                            {state.groups.map(renderGroup)}
                        </>
                    ) : (
                        <Decision value={state.groups} loading={state.isLoading}>
                            <Decision.Loading>
                                <LoadingSpinner size="lg" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<MessagesSquare />}
                                    title="No groups yet"
                                    description="After you run a registration command in Telegram, the group will appear here."
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {state.groups.map(renderGroup)}
                            </Decision.Data>
                        </Decision>
                    )}
                </Section.Body>
            </Section>

            <MessageTemplates />

            <ConnectEventsModal target={state.connectTarget} onClose={actions.closeConnect} />
        </div>
    );
}
