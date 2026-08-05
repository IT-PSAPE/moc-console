import { Section } from "@moc/ui/components/display/section";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { MessagesSquare } from "lucide-react";
import { Decision } from "@moc/ui/components/display/decision";
import type { TelegramGroup } from "@/data/fetch-telegram-groups";
import { ConnectEventsModal } from "./connect-events-modal";
import { MessageTemplates } from "./message-templates/list";
import { MessageFormatSection } from "./message-format-section";
import { useTelegramSettings } from "./use-telegram-settings";
import { TelegramGroupCard } from "./telegram-group-card";

export function TelegramTab() {
    const { state, actions } = useTelegramSettings();

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
                <Section.Header title="Telegram groups" description="Choose where workspace notifications are delivered." />

                <Section.Body className="gap-4">
                    <Decision value={state.groups} loading={state.isLoading}>
                        <Decision.Loading>
                            <LoadingSpinner size="lg" />
                        </Decision.Loading>
                        <Decision.Empty>
                            <EmptyState
                                icon={<MessagesSquare />}
                                title="No groups yet"
                                description={
                                    state.currentWorkspaceSlug
                                        ? `Add the bot to a Telegram group, then send "/register_group ${state.currentWorkspaceSlug}" in that group.`
                                        : "Add the bot to a Telegram group, then send /register_group <workspace-slug> in that group."
                                }
                            />
                        </Decision.Empty>
                        <Decision.Data>
                            {state.groups.map(renderGroup)}
                        </Decision.Data>
                    </Decision>
                </Section.Body>
            </Section>

            <MessageTemplates />

            <MessageFormatSection />

            <ConnectEventsModal target={state.connectTarget} onClose={actions.closeConnect} />
        </div>
    );
}
