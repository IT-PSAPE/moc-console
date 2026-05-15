import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@moc/ui/components/overlays/modal";
import { Button } from "@moc/ui/components/controls/button";
import { Toggle } from "@moc/ui/components/form/toggle";
import { Paragraph, Label } from "@moc/ui/components/display/text";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { supabase } from "@moc/data/supabase";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import {
    NOTIFICATION_EVENTS,
    type NotificationEventKey,
} from "@moc/data/notification-events";
import {
    createNotificationRoute,
    deleteNotificationRoute,
    type NotificationRoute,
} from "@moc/data/notification-routes";

export type ConnectEventsTarget = {
    workspaceId: string;
    groupChatId: string;
    groupTitle: string;
    threadId: number | null;
    topicName: string | null;
};

type ConnectEventsModalProps = {
    target: ConnectEventsTarget | null;
    onClose: () => void;
};

type Row = {
    id: string;
    workspace_id: string;
    event_type: string;
    group_chat_id: string;
    thread_id: number | null;
    enabled: boolean;
    created_at: string;
    updated_at: string;
};

function rowToRoute(row: Row): NotificationRoute {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        eventType: row.event_type as NotificationEventKey,
        groupChatId: row.group_chat_id,
        threadId: row.thread_id,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Scoped fetch — only the routes for one destination. Splits "thread is null"
// vs "thread = N" so a NULL filter doesn't accidentally match a numbered topic.
async function fetchRoutesForTarget(target: ConnectEventsTarget): Promise<NotificationRoute[]> {
    let query = supabase
        .from("notification_routes")
        .select("id, workspace_id, event_type, group_chat_id, thread_id, enabled, created_at, updated_at")
        .eq("workspace_id", target.workspaceId)
        .eq("group_chat_id", target.groupChatId);
    query = target.threadId === null ? query.is("thread_id", null) : query.eq("thread_id", target.threadId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(rowToRoute);
}

export function ConnectEventsModal({ target, onClose }: ConnectEventsModalProps) {
    const { toast } = useFeedback();
    const [routes, setRoutes] = useState<NotificationRoute[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingKey, setPendingKey] = useState<NotificationEventKey | null>(null);

    useEffect(() => {
        if (!target) {
            setRoutes([]);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        void (async () => {
            try {
                const data = await fetchRoutesForTarget(target);
                if (!cancelled) setRoutes(data);
            } catch (error) {
                if (!cancelled) {
                    toast({
                        title: "Couldn't load event connections",
                        description: error instanceof Error ? error.message : "Unknown error",
                        variant: "error",
                    });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [target, toast]);

    const routeByEvent = useMemo(() => {
        const m = new Map<NotificationEventKey, NotificationRoute>();
        for (const r of routes) m.set(r.eventType, r);
        return m;
    }, [routes]);

    const handleToggle = useCallback(
        (eventKey: NotificationEventKey) => async (next: boolean) => {
            if (!target) return;
            setPendingKey(eventKey);
            const existing = routeByEvent.get(eventKey);
            try {
                if (next) {
                    if (existing) return;
                    const created = await createNotificationRoute({
                        workspaceId: target.workspaceId,
                        eventType: eventKey,
                        groupChatId: target.groupChatId,
                        threadId: target.threadId,
                    });
                    setRoutes((prev) => [...prev, created]);
                } else {
                    if (!existing) return;
                    await deleteNotificationRoute(existing.id);
                    setRoutes((prev) => prev.filter((r) => r.id !== existing.id));
                }
            } catch (error) {
                toast({
                    title: next ? "Couldn't connect event" : "Couldn't disconnect event",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "error",
                });
            } finally {
                setPendingKey(null);
            }
        },
        [target, routeByEvent, toast],
    );

    const destinationLabel = target
        ? target.topicName
            ? `${target.groupTitle} › ${target.topicName}`
            : target.threadId !== null
                ? `${target.groupTitle} › Topic #${target.threadId}`
                : `${target.groupTitle} › General`
        : "";

    return (
        <Modal open={target !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-lg">
                        <Modal.Header>
                            <div className="flex flex-col gap-1">
                                <Label.md>Connect events</Label.md>
                                <Paragraph.xs className="text-quaternary">{destinationLabel}</Paragraph.xs>
                            </div>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col p-2">
                                {isLoading ? (
                                    <div className="flex justify-center py-6">
                                        <LoadingSpinner size="lg" />
                                    </div>
                                ) : (
                                    NOTIFICATION_EVENTS.map((event) => {
                                        const connected = routeByEvent.has(event.key);
                                        return (
                                            <div
                                                key={event.key}
                                                className="flex items-center justify-between gap-3 px-3 py-3 border-b border-tertiary last:border-b-0"
                                            >
                                                <div className="flex flex-1 flex-col gap-0.5">
                                                    <Label.sm>{event.label}</Label.sm>
                                                    <Paragraph.xs className="text-quaternary">
                                                        {event.description}
                                                    </Paragraph.xs>
                                                </div>
                                                <Toggle
                                                    checked={connected}
                                                    disabled={pendingKey === event.key}
                                                    onChange={handleToggle(event.key)}
                                                />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Done</Button>
                            </Modal.Close>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    );
}
