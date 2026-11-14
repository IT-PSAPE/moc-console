import { Button } from "@moc/ui/components/controls/button";
import { Card } from "@moc/ui/components/display/card";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, PrintingPage } from "iconoir-react";
import type { Equipment } from "@moc/types/equipment";
import { useEquipmentQr } from "./use-equipment-qr";


export function EquipmentQrSection({ equipment }: { equipment: Equipment }) {
  const { state, actions, meta: { canvasRef } } = useEquipmentQr(equipment);

  return (
    <section>
      <Label.sm className="block pb-3 text-primary">QR code</Label.sm>
      <div className="flex flex-col items-center gap-3">
        <Card className="w-fit p-4">
          <QRCodeCanvas ref={canvasRef} value={state.payload} size={160} level="M" marginSize={4} />
        </Card>
        <Paragraph.xs className="max-w-xs text-center text-tertiary">
          Print and attach to the item. Scanning it during booking collection ticks it off automatically.
        </Paragraph.xs>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Download />} onClick={actions.download}>
            Download
          </Button>
          <Button size="sm" variant="secondary" icon={<PrintingPage />} onClick={actions.print}>
            Print
          </Button>
          <Button size="sm" variant="secondary" icon={state.hasCopied ? <Check className="text-success" /> : <Copy />} onClick={actions.copy}>
            {state.hasCopied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </section>
  );
}
