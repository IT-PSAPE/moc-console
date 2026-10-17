import { Badge } from "@moc/ui/components/display/badge";
import { Indicator } from "@moc/ui/components/display/indicator";
import { KanbanBoard } from "@moc/ui/components/display/kanban-board";
import { RequestItem } from "./request-item";
import type { Request } from "@moc/types/requests";
import { statusGroups } from "@moc/types/requests";
import { DraggableRequestItem } from "./draggable-request-item";
import { useRequestKanbanStatusChange } from "./use-request-kanban-status-change";

export function RequestKanbanView({ requests }: { requests: Request[] }) {
    const drag = useRequestKanbanStatusChange();

    return (
        <KanbanBoard onDragStart={drag.actions.handleDragStart} onDragEnd={drag.actions.handleDragEnd}>
            <KanbanBoard.Columns>
                {statusGroups.map((group) => {
                    const items = requests.filter((r) => r.status === group.key);
                    return (
                        <KanbanBoard.Column key={group.key} id={group.key}>
                            <KanbanBoard.ColumnHeader>
                                <Indicator.Dot color={group.color} />
                                <span>{group.label}</span>
                                <Badge label={String(items.length)} />
                            </KanbanBoard.ColumnHeader>
                            <KanbanBoard.ColumnContent>
                                {items.map((r) => (
                                    <DraggableRequestItem key={r.id} request={r} />
                                ))}
                            </KanbanBoard.ColumnContent>
                        </KanbanBoard.Column>
                    );
                })}
            </KanbanBoard.Columns>

            <KanbanBoard.Overlay>
                {drag.state.activeItem && <RequestItem request={drag.state.activeItem} />}
            </KanbanBoard.Overlay>
        </KanbanBoard>
    );
}
