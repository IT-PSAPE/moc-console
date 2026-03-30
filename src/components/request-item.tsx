import { Dot } from "lucide-react";
import { Label, Paragraph } from "./text";

export function RequestItem() {
    return (
        <div className="w-full px-4 py-3 bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary inline-flex justify-between items-center">
            <div className="flex-1 max-w-xl">
                <Label.sm>Request name</Label.sm>
                <Paragraph.sm className="text-tertiary">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.</Paragraph.sm>
            </div>
            <div className="max-w-xl flex justify-end items-center gap-2 flex-wrap content-center">
                <Badge /> <Badge /> <Badge />
            </div>
        </div>
    )
}

function Badge({ icon }: { icon?: React.ReactNode }) {
    return (
        <div data-status="Pending" data-style="Badge" className="w-fit shrink-0 flex justify-center items-center gap-0.5 py-1 px-1 pr-2 bg-orange-50 rounded text-yellow-600">
            {icon ? <div className="*:size-4 text-yellow-600">{icon}</div> : <Dot className="size-4 text-yellow-600" />}
            <Label.xs className="text-yellow-600 leading-[1.1]">Label</Label.xs>
        </div>
    )
}