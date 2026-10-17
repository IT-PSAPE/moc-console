import { Label } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { FiveWRow } from "./five-w-row";

export function RequestFiveW({ request }: { request: Request }) {
  return (
    <div>
      <Label.sm className="block pb-3 text-primary">5Ws and 1H</Label.sm>
      <div className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
        <FiveWRow label="Who" value={request.who} />
        <FiveWRow label="What" value={request.what} />
        <FiveWRow label="When" value={request.when} />
        <FiveWRow label="Where" value={request.where} />
        <FiveWRow label="Why" value={request.why} />
        <FiveWRow label="How" value={request.how} />
      </div>
    </div>
  );
}
