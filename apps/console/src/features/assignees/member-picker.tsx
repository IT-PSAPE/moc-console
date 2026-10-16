import { Button } from "@moc/ui/components/controls/button";
import { Label } from "@moc/ui/components/display/text";
import { Popover } from "@moc/ui/components/overlays/popover";
import { Modal } from "@moc/ui/components/overlays/modal";
import { useIsLandscape } from "@moc/ui/hooks/use-is-landscape";
import { type ResolvedAssignee } from "@/data/fetch-assignees";
import { X } from "lucide-react";
import type { ReactElement } from "react";
import { MemberPickerPanel } from "./member-picker-panel";

type MemberPickerProps = {
    assignees: ResolvedAssignee[];
    onAdd: (userId: string) => void;
    onRemove: (userId: string) => void;
    children: ReactElement;
    placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
};

export function MemberPicker({ assignees, onAdd, onRemove, children, placement = 'bottom-end' }: MemberPickerProps) {
    const isLandscape = useIsLandscape();

    if (isLandscape) {
        return (
            <Modal>
                <Modal.Trigger>{children}</Modal.Trigger>
                <Modal.Portal>
                    <Modal.Backdrop />
                    <Modal.Positioner>
                        <Modal.Panel>
                            <Modal.Header>
                                <Label.md className="flex-1">Assign member</Label.md>
                                <Modal.Close>
                                    <Button.Icon aria-label="Close member picker" variant="ghost" icon={<X />} />
                                </Modal.Close>
                            </Modal.Header>
                            <Modal.Content className="p-0">
                                <MemberPickerPanel assignees={assignees} onAdd={onAdd} onRemove={onRemove} />
                            </Modal.Content>
                        </Modal.Panel>
                    </Modal.Positioner>
                </Modal.Portal>
            </Modal>
        );
    }

    return (
        <Popover placement={placement}>
            <Popover.Trigger>{children}</Popover.Trigger>
            <Popover.Panel className="w-72">
                <MemberPickerPanel assignees={assignees} onAdd={onAdd} onRemove={onRemove} />
            </Popover.Panel>
        </Popover>
    );
}
