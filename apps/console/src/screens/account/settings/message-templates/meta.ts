// Label + description + scope for every editable message type, shared
// by the list and the detail page so the two never drift.

import { NOTIFICATION_EVENTS } from "@/data/notification-events";
import {
    DM_MESSAGE_LABELS,
    DM_MESSAGE_TYPES,
    scopeForMessageType,
    type DmMessageType,
    type MessageType,
    type TemplateScope,
} from "@/data/notification-templates-core";

const GROUP_META = new Map(
    NOTIFICATION_EVENTS.map((e) => [e.key as MessageType, { label: e.label, description: e.description }]),
);

const DM_DESCRIPTIONS: Record<DmMessageType, string> = {
    "assignment.request": "Direct message sent when someone is assigned to a request.",
    "assignment.cue": "Direct message sent when someone is assigned to a cue.",
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
export const GROUP_MESSAGE_TYPES = NOTIFICATION_EVENTS.map((e) => e.key);
