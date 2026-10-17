import { cn } from "@moc/utils/cn";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DndContextProps,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import { ListSurfaceContext } from "./list-surface-context";

type ColumnContextValue = {
    state: { isOver: boolean };
    actions: Record<string, never>;
    meta: { setNodeRef: (node: HTMLElement | null) => void };
};

const ColumnContext = createContext<ColumnContextValue | null>(null);

function useColumnContext(component: string) {
    const ctx = useContext(ColumnContext);
    if (!ctx) {
        throw new Error(`${component} must be used inside <KanbanBoard.Column>`);
    }
    return ctx;
}

type RootProps = Omit<DndContextProps, "sensors" | "collisionDetection"> & {
    children: ReactNode;
};

function KanbanBoardRoot({ children, ...props }: RootProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} {...props}>
            {children}
        </DndContext>
    );
}

function KanbanBoardColumns({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className="w-full overflow-x-auto">
            <div
                className={cn(
                    "flex min-w-full gap-3 pb-2 *:min-w-sm *:flex-1",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>
    );
}

function KanbanBoardColumn({ id, children, className, ...props }: HTMLAttributes<HTMLDivElement> & { id: string }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <ColumnContext.Provider value={{ state: { isOver }, actions: {}, meta: { setNodeRef } }}>
            <div
                className={cn(
                    "flex min-w-0 flex-col gap-2 rounded-xl bg-secondary p-2",
                    isOver ? "ring-2 ring-border-brand ring-offset-2 transition-shadow" : "transition-shadow",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </ColumnContext.Provider>
    );
}

// Pair with a count badge, e.g. `<KanbanBoard.ColumnHeader><Indicator.Dot .../><span>{label}</span><Badge label={String(items.length)} /></KanbanBoard.ColumnHeader>`.
function KanbanBoardColumnHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center gap-2 px-1 pb-2 label-xs text-quaternary landscape:flex-col landscape:items-start", className)} {...props}>
            {children}
        </div>
    );
}

function KanbanBoardColumnContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { meta: { setNodeRef } } = useColumnContext("KanbanBoard.ColumnContent");
    return (
        <div ref={setNodeRef} className={cn("flex min-h-16 flex-col gap-2", className)} {...props}>
            {children}
        </div>
    );
}

type ItemProps = {
    id: string;
    data?: Record<string, unknown>;
    disabled?: boolean;
    children: ReactNode;
};

function KanbanBoardItem({ id, data, disabled = false, children }: ItemProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        data,
        disabled,
    });

    const style = {
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
    };

    // Nested `InteractiveSurface.Card` triggers (the item content's click/drag
    // surface) render as a flat row — not another bordered card — inside the
    // `ListSurfaceContext`, so this wrapper is the only card chrome.
    return (
        <div ref={setNodeRef} style={style} {...(disabled ? {} : { ...listeners, ...attributes })}>
            <ListSurfaceContext.Provider value={true}>
                <div className={cn("overflow-hidden rounded-lg", isDragging ? "border-2 border-dashed border-secondary" : "border border-secondary bg-primary shadow-xs")}>
                    <div className={isDragging ? "invisible" : ""}>{children}</div>
                </div>
            </ListSurfaceContext.Provider>
        </div>
    );
}

function KanbanBoardOverlay({ children }: { children: ReactNode }) {
    return (
        <DragOverlay>
            {children ? (
                <ListSurfaceContext.Provider value={true}>
                    <div className="overflow-hidden rounded-lg border border-secondary bg-primary shadow-xs opacity-90 rotate-2 scale-105">{children}</div>
                </ListSurfaceContext.Provider>
            ) : null}
        </DragOverlay>
    );
}

export const KanbanBoard = Object.assign(KanbanBoardRoot, {
    Columns: KanbanBoardColumns,
    Column: KanbanBoardColumn,
    ColumnHeader: KanbanBoardColumnHeader,
    ColumnContent: KanbanBoardColumnContent,
    Item: KanbanBoardItem,
    Overlay: KanbanBoardOverlay,
});
