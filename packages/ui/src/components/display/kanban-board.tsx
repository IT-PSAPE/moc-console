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
                    "flex min-w-0 flex-col gap-1.5 rounded-lg border border-secondary bg-secondary p-1.5",
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

function KanbanBoardColumnHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex min-h-8 items-center gap-1.5 px-1.5 landscape:flex-col landscape:items-start", className)} {...props}>
            {children}
        </div>
    );
}

function KanbanBoardColumnContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { meta: { setNodeRef } } = useColumnContext("KanbanBoard.ColumnContent");
    return (
        <div ref={setNodeRef} className={cn("flex min-h-16 flex-col gap-1.5", className)} {...props}>
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

    return (
        <div ref={setNodeRef} style={style} {...(disabled ? {} : { ...listeners, ...attributes })}>
            <div className={isDragging ? "rounded-lg border-2 border-dashed border-secondary" : ""}>
                <div className={isDragging ? "invisible" : ""}>{children}</div>
            </div>
        </div>
    );
}

function KanbanBoardOverlay({ children }: { children: ReactNode }) {
    return (
        <DragOverlay>
            {children ? <div className="opacity-90 rotate-2 scale-105">{children}</div> : null}
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
