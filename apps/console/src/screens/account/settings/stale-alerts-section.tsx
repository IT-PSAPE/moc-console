import { Section } from "@moc/ui/components/display/section";
import { Divider } from "@moc/ui/components/display/divider";
import { Input } from "@moc/ui/components/form/input";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { useWorkspace } from "@/lib/workspace-context";
import { MemberSearchPicker } from "@/features/assignees/member-search-picker";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@moc/types/requests";
import {
    addNotificationRecipient,
    fetchNotificationRecipients,
    removeNotificationRecipient,
    type NotificationRecipient,
} from "@/data/notification-recipients";
import {
    DEFAULT_STALE_THRESHOLD_DAYS,
    fetchNotificationSettings,
    updateStaleThresholdDays,
} from "@/data/notification-settings";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";

const NOT_LINKED_CAPTION = "⚠ Telegram not linked — won't receive DMs";

// MemberSearchPicker renders `duty` as the muted caption; we use it to
// flag recipients without a linked Telegram so admins see who is silent.
function toAssignee(recipient: NotificationRecipient): ResolvedAssignee {
    return { ...recipient, duty: recipient.telegramChatId ? "" : NOT_LINKED_CAPTION };
}

export function StaleAlertsSection() {
    const { toast } = useFeedback();
    const { currentWorkspaceId } = useWorkspace();

    const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
    const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_STALE_THRESHOLD_DAYS));
    const [savedThreshold, setSavedThreshold] = useState(DEFAULT_STALE_THRESHOLD_DAYS);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setRecipients([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [people, settings] = await Promise.all([
                fetchNotificationRecipients(currentWorkspaceId),
                fetchNotificationSettings(currentWorkspaceId),
            ]);
            setRecipients(people);
            setSavedThreshold(settings.staleThresholdDays);
            setThresholdInput(String(settings.staleThresholdDays));
        } catch (error) {
            toast({
                title: "Couldn't load stale-alert settings",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspaceId, toast]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleAddRecipient = useCallback(
        async (user: User) => {
            if (!currentWorkspaceId) return;
            setRecipients((prev) => [...prev, { ...user, recipientId: `temp-${user.id}` }]);
            try {
                await addNotificationRecipient(currentWorkspaceId, user.id);
                await load();
            } catch (error) {
                setRecipients((prev) => prev.filter((r) => r.id !== user.id));
                toast({
                    title: "Couldn't add recipient",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "error",
                });
            }
        },
        [currentWorkspaceId, load, toast],
    );

    const handleRemoveRecipient = useCallback(
        async (userId: string) => {
            if (!currentWorkspaceId) return;
            const previous = recipients;
            setRecipients((prev) => prev.filter((r) => r.id !== userId));
            try {
                await removeNotificationRecipient(currentWorkspaceId, userId);
            } catch (error) {
                setRecipients(previous);
                toast({
                    title: "Couldn't remove recipient",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "error",
                });
            }
        },
        [currentWorkspaceId, recipients, toast],
    );

    const handleThresholdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setThresholdInput(event.target.value);
    }, []);

    const handleThresholdBlur = useCallback(async () => {
        if (!currentWorkspaceId) return;
        const days = Number.parseInt(thresholdInput, 10);
        if (!Number.isInteger(days) || days < 1) {
            setThresholdInput(String(savedThreshold));
            return;
        }
        if (days === savedThreshold) return;
        try {
            await updateStaleThresholdDays(currentWorkspaceId, days);
            setSavedThreshold(days);
            toast({ title: "Stale threshold updated", variant: "success" });
        } catch (error) {
            setThresholdInput(String(savedThreshold));
            toast({
                title: "Couldn't update threshold",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "error",
            });
        }
    }, [currentWorkspaceId, thresholdInput, savedThreshold, toast]);

    return (
        <Section>
            <Section.Header
                title="Stale-item alerts"
                description="Telegram reminders when requests or bookings go unattended. People below are DM'd; connect these events to a group in the section above to also post there."
            />

            <Divider className="py-6" />

            <Section.Body className="gap-6">
                {isLoading ? (
                    <LoadingSpinner className="py-8" />
                ) : (
                    <>
                        <div className="flex flex-col gap-2 max-w-xs">
                            <Label.sm>Flag after (days without activity)</Label.sm>
                            <Input
                                type="number"
                                min={1}
                                value={thresholdInput}
                                onChange={handleThresholdChange}
                                onBlur={handleThresholdBlur}
                            />
                            <Paragraph.xs className="text-quaternary">
                                Also the reminder interval — a stale item is re-sent at most once every {savedThreshold} day(s).
                            </Paragraph.xs>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label.sm>Recipients</Label.sm>
                            <MemberSearchPicker
                                assignees={recipients.map(toAssignee)}
                                onAdd={handleAddRecipient}
                                onRemove={handleRemoveRecipient}
                                placeholder="Add a person..."
                                emptyLabel="No recipients yet — add people to alert."
                            />
                        </div>
                    </>
                )}
            </Section.Body>
        </Section>
    );
}
