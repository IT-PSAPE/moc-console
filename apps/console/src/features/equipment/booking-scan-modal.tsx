import { Button } from "@moc/ui/components/controls/button";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Badge } from "@moc/ui/components/display/badge";
import { Notification } from "@moc/ui/components/feedback/notification";
import { Input } from "@moc/ui/components/form/input";
import { Modal } from "@moc/ui/components/overlays/modal";
import { Camera, Keyboard, ScanLine, Smartphone } from "lucide-react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

type BookingScanModalProps = {
  open: boolean;
  isStarting: boolean;
  isSupported: boolean;
  error: string | null;
  scannedCount: number;
  totalCount: number;
  manualCode: string;
  onClose: () => void;
  onManualCodeChange: (value: string) => void;
  onManualCodeSubmit: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function BookingScanModal({
  open,
  isStarting,
  isSupported,
  error,
  scannedCount,
  totalCount,
  manualCode,
  onClose,
  onManualCodeChange,
  onManualCodeSubmit,
  videoRef,
}: BookingScanModalProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
    }
  }

  function handleManualCodeChange(event: ChangeEvent<HTMLInputElement>) {
    onManualCodeChange(event.target.value);
  }

  function handleManualCodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onManualCodeSubmit();
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="overflow-hidden max-w-lg landscape:max-w-none">
            <Modal.Header>
              <Label.md>Scan booking items</Label.md>
            </Modal.Header>

            <Modal.Content>
              <Badge label={`${scannedCount} of ${totalCount} scanned`} color="blue" />

              {isSupported ? (
                <video
                  ref={videoRef}
                  autoPlay
                  className="aspect-[3/4] w-full rounded-lg border border-secondary bg-secondary object-cover"
                  muted
                  playsInline
                />
              ) : (
                <EmptyState
                  className="rounded-lg border border-dashed border-secondary py-10"
                  icon={<Smartphone />}
                  title="QR scanning is unavailable here"
                  description="Enter the equipment code below or use a supported camera scanner."
                />
              )}

              {isSupported && (
                <Paragraph.sm className="text-tertiary">
                  {isStarting
                    ? "Starting the rear camera…"
                    : "Point the camera at one booking item's QR code and hold steady."}
                </Paragraph.sm>
              )}

              {open && error ? <Notification title="Scanner error" description={error} variant="error" /> : null}

              <div className="flex items-center gap-2">
                <Input
                  aria-label="Equipment code"
                  autoComplete="off"
                  icon={<Keyboard />}
                  name="equipment-code"
                  placeholder="Enter equipment code…"
                  value={manualCode}
                  onChange={handleManualCodeChange}
                  onKeyDown={handleManualCodeKeyDown}
                />
                <Button variant="secondary" onClick={onManualCodeSubmit} disabled={!manualCode.trim()}>
                  Add
                </Button>
              </div>
            </Modal.Content>

            <Modal.Footer>
              <Button variant="secondary" onClick={onClose} icon={isSupported ? <ScanLine /> : <Camera />}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
