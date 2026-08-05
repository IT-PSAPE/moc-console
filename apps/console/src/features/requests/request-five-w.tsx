import { Label } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { cn } from "@moc/utils/cn";
import { FiveWRow } from "./five-w-row";

export function RequestFiveW({ request, className }: { request: Request; className?: string }) {
  return (
    <div className={cn(className)}>
      <Label.md className="block pb-3">5Ws and 1H</Label.md>
      <div className="space-y-3">
        <FiveWRow label="Who" value={request.who} /><FiveWRow label="What" value={request.what} /><FiveWRow label="When" value={request.when} />
        <FiveWRow label="Where" value={request.where} /><FiveWRow label="Why" value={request.why} /><FiveWRow label="How" value={request.how} />
      </div>
    </div>
  );
}
