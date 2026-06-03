import { Button } from "@moc/ui/components/controls/button";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";
import type { Equipment } from "@moc/types/equipment";
import { buildEquipmentQrPayload } from "./equipment-qr";

function toFileSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "equipment";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Generates the printable identity QR for a single equipment item. The encoded
// value is the structured payload from equipment-qr.ts, which the booking
// scanner knows how to read.
export function EquipmentQrSection({ equipment }: { equipment: Equipment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const payload = buildEquipmentQrPayload(equipment);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${toFileSlug(equipment.name)}-${toFileSlug(equipment.serialNumber)}-qr.png`;
    link.click();
  }

  function handlePrint() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=420,height=560");
    if (!printWindow) {
      return;
    }
    const name = escapeHtml(equipment.name);
    const serial = escapeHtml(equipment.serialNumber);
    printWindow.document.write(
      `<!doctype html><html><head><title>${name}</title>` +
        "<style>" +
        "body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "min-height:100vh;font-family:system-ui,-apple-system,sans-serif;}" +
        "img{width:280px;height:280px;}" +
        "h1{font-size:18px;margin:16px 0 4px;text-align:center;}" +
        "p{margin:0;color:#555;font-size:14px;}" +
        "</style></head>" +
        `<body><img src="${dataUrl}" alt="${name} QR code"/><h1>${name}</h1><p>${serial}</p>` +
        "<script>window.onload=function(){window.focus();window.print();window.close();};</script>" +
        "</body></html>",
    );
    printWindow.document.close();
  }

  return (
    <section className="px-4">
      <Label.xs className="uppercase tracking-wide text-quaternary">QR Code</Label.xs>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="rounded-lg border border-secondary bg-white p-3">
          <QRCodeCanvas ref={canvasRef} value={payload} size={160} level="M" marginSize={4} />
        </div>
        <div className="flex flex-col gap-3">
          <Paragraph.sm className="text-tertiary">
            Print and attach to the item. Scanning it during booking collection ticks it off automatically.
          </Paragraph.sm>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Download />} onClick={handleDownload}>
              Download
            </Button>
            <Button variant="secondary" icon={<Printer />} onClick={handlePrint}>
              Print
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
