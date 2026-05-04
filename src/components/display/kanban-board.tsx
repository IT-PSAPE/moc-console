import { Card } from "@/components/display/card";
import { cn } from "@/utils/cn";
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
    setNodeRef: (node: HTMLElement | null) => void;
    isOver: boolean;
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
        <div className="overflow-x-auto w-full">
            <div
                className={cn(
                    "flex gap-3 p-4 pt-0 mx-auto w-full max-w-content *:flex-1 *:min-w-sm",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>
    );
}

function KanbanBoardColumn({
    id,
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement> & { id: string }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <ColumnContext.Provider value={{ setNodeRef, isOver }}>
            <Card
                className={cn(
                    isOver ? "ring-2 ring-brand ring-offset-2 transition-shadow" : "transition-shadow",
                    className,
                )}
                {...props}
            >
                {children}
            </Card>
        </ColumnContext.Provider>
    );
}

function KanbanBoardColumnHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <Card.Header className={cn("gap-1.5", className)} {...props}>
            {children}
        </Card.Header>
    );
}

function KanbanBoardColumnContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { setNodeRef } = useColumnContext("KanbanBoard.ColumnContent");
    return (
        <div ref={setNodeRef}>
            <Card.Content ghost className={cn("flex flex-col gap-1.5 min-h-16", className)} {...props}>
                {children}
            </Card.Content>
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
