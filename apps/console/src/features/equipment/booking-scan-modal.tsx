import { Button } from "@moc/ui/components/controls/button";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { Badge } from "@moc/ui/components/display/badge";
import { Alert } from "@moc/ui/components/feedback/alert";
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
          <Modal.FullScreenPanel className="overflow-hidden md:max-w-lg">
            <Modal.Header className="items-start">
              <div>
                <Title.h6>Scan booking items</Title.h6>
              </div>
            </Modal.Header>

            <Modal.Content className="flex-col gap-4 p-4">
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
                  description="Use a browser with camera barcode support."
                />
              )}

              {isSupported && (
                <Paragraph.sm className="text-tertiary">
                  {isStarting
                    ? "Starting the rear camera…"
                    : "Point the camera at one booking item's QR code and hold steady."}
                </Paragraph.sm>
              )}

              {error ? <Alert title="Scanner error" description={error} variant="error" /> : null}
            </Modal.Content>

            <Modal.Footer className="justify-end">
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
