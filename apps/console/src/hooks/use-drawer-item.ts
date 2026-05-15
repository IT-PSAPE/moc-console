import { useCallback, useRef, useState, type RefObject } from "react";

export type DrawerItemHandle = {
    open: boolean;
    isDirtyRef: RefObject<boolean>;
    requestCloseRef: RefObject<(() => void) | null>;
    handleOpenChange: (nextOpen: boolean) => void;
    handleClose: () => void;
};

export function useDrawerItem(onOpenChange?: (open: boolean) => void): DrawerItemHandle {
    const [open, setOpen] = useState(false);
    const isDirtyRef = useRef(false);
    const requestCloseRef = useRef<(() => void) | null>(null);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (nextOpen) {
                setOpen(true);
                onOpenChange?.(true);
            } else if (isDirtyRef.current) {
                requestCloseRef.current?.();
            } else {
                setOpen(false);
                onOpenChange?.(false);
            }
        },
        [onOpenChange],
    );

    const handleClose = useCallback(() => {
        setOpen(false);
        onOpenChange?.(false);
    }, [onOpenChange]);

    return { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose };
}

export type TableRowDrawerHandle<T> = {
    selected: T | null;
    setSelected: (row: T | null) => void;
    isDirtyRef: RefObject<boolean>;
    requestCloseRef: RefObject<(() => void) | null>;
    handleOpenChange: (open: boolean) => void;
    handleClose: () => void;
};

export function useTableRowDrawer<T>(): TableRowDrawerHandle<T> {
    const [selected, setSelected] = useState<T | null>(null);
    const isDirtyRef = useRef(false);
    const requestCloseRef = useRef<(() => void) | null>(null);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open && isDirtyRef.current) {
            requestCloseRef.current?.();
        } else if (!open) {
            setSelected(null);
        }
    }, []);

    const handleClose = useCallback(() => {
        setSelected(null);
    }, []);

    return { selected, setSelected, isDirtyRef, requestCloseRef, handleOpenChange, handleClose };
}
