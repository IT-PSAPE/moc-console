import { Label } from "@moc/ui/components/display/text";
import { Modal } from "@moc/ui/components/overlays/modal";
import type { Stream, StreamPreset } from "@moc/types/streams/stream";
import { StreamForm } from "./stream-form";
import type { StreamFormData } from "./use-stream-form";

type StreamModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: StreamFormData) => Promise<void> | void;
  stream?: Stream | null;
  preset?: StreamPreset | null;
};

export function StreamModal({ open, onOpenChange, onSubmit, stream, preset }: StreamModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="md:max-w-lg">
            <Modal.Header>
              <Label.md>{stream ? "Edit stream" : "Create stream"}</Label.md>
            </Modal.Header>
            <StreamForm open={open} onOpenChange={onOpenChange} onSubmit={onSubmit} stream={stream} preset={preset} />
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
