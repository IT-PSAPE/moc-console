// Label + description + scope for every editable message type, shared
// by the list and the detail page so the two never drift.

import {
    ANNOUNCEMENT_EVENT_KEYS,
    NOTIFICATION_EVENTS,
    DM_MESSAGE_LABELS,
    DM_MESSAGE_TYPES,
    scopeForMessageType,
    type AnnouncementEventKey,
    type DmMessageType,
    type MessageType,
    type TemplateScope,
} from "@moc/notifications";

// Only the five announcement events are templatable — every other event
// now renders a short follow-up note instead (see @moc/notifications'
// telegram-notes.ts), so the message-template list/editor never see them.
const NOTIFICATION_EVENT_META = new Map(NOTIFICATION_EVENTS.map((e) => [e.key, e]));

const GROUP_META = new Map(
    ANNOUNCEMENT_EVENT_KEYS.map((key) => {
        const event = NOTIFICATION_EVENT_META.get(key);
        return [key as MessageType, { label: event?.label ?? key, description: event?.description ?? "" }] as const;
    }),
);

const DM_DESCRIPTIONS: Record<DmMessageType, string> = {
    "assignment.request": "Direct message sent when someone is assigned to a request.",
    "assignment.checklist_item": "Direct message sent when someone is assigned to a checklist item.",
};

export type MessageTypeMeta = {
    label: string;
    description: string;
    scope: TemplateScope;
};

export function messageTypeMeta(type: MessageType): MessageTypeMeta {
    const scope = scopeForMessageType(type);
    if (scope === "dm") {
        return {
            label: DM_MESSAGE_LABELS[type as DmMessageType],
            description: DM_DESCRIPTIONS[type as DmMessageType],
            scope,
        };
    }
    const g = GROUP_META.get(type);
    return { label: g?.label ?? type, description: g?.description ?? "", scope };
}

export function isMessageType(value: string): value is MessageType {
    return GROUP_META.has(value as MessageType) || (DM_MESSAGE_TYPES as readonly string[]).includes(value);
}

export { DM_MESSAGE_TYPES };
export const GROUP_MESSAGE_TYPES: readonly AnnouncementEventKey[] = ANNOUNCEMENT_EVENT_KEYS;
