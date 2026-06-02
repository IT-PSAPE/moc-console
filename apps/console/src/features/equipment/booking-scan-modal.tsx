import { Button } from "@moc/ui/components/controls/button";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Label, Paragraph, Title } from "@moc/ui/components/display/text";
import { Modal } from "@moc/ui/components/overlays/modal";
import { Camera, ScanLine, Smartphone } from "lucide-react";
import type { RefObject } from "react";

type BookingScanModalProps = {
  open: boolean;
  isStarting: boolean;
  isSupported: boolean;
  error: string | null;
  scannedCount: number;
  totalCount: number;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function BookingScanModal({
  open,
  isStarting,
  isSupported,
  error,
  scannedCount,
  totalCount,
  onClose,
  videoRef,
}: BookingScanModalProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="max-w-lg overflow-hidden">
            <Modal.Header className="items-start">
              <div>
                <Title.h6>Scan Booking Items</Title.h6>
                <Paragraph.sm className="mt-1 text-tertiary">
                  Scan each item to tick it off as you gather it.
                </Paragraph.sm>
              </div>
            </Modal.Header>

            <Modal.Content className="flex-col gap-4 p-4">
              <div className="rounded-lg border border-secondary bg-secondary/40 p-3">
                <Label.sm>{scannedCount} of {totalCount} scanned</Label.sm>
              </div>

              {isSupported ? (
                <div className="overflow-hidden rounded-lg border border-secondary bg-primary_hover">
                  <video
                    ref={videoRef}
                    autoPlay
                    className="aspect-[3/4] w-full bg-secondary object-cover"
                    muted
                    playsInline
                  />
                </div>
              ) : (
                <EmptyState
                  className="rounded-lg border border-dashed border-secondary py-10"
                  icon={<Smartphone />}
                  title="QR scanning is unavailable here"
                  description="This browser does not expose the camera barcode APIs needed for in-app scanning."
                />
              )}

              {isSupported && (
                <Paragraph.sm className="text-tertiary">
                  {isStarting
                    ? "Starting the rear camera..."
                    : "Point the camera at one booking item's QR code and hold steady."}
                </Paragraph.sm>
              )}

              {error ? (
                <div className="rounded-lg border border-secondary bg-primary_hover p-3">
                  <Paragraph.sm className="text-secondary">{error}</Paragraph.sm>
                </div>
              ) : null}
            </Modal.Content>

            <Modal.Footer className="justify-end">
              <Button variant="secondary" onClick={onClose} icon={isSupported ? <ScanLine /> : <Camera />}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
