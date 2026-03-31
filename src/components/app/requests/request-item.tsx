import { Dot } from "lucide-react";
import { Label, Paragraph } from "../../display/text";
import { Badge } from "../../display/badge";
import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";


const itemVariants = cv({
    base: [
        'w-full flex justify-between px-4 py-3 gap-4 bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary',
    ],
    variants: {
        vertical: {
            true: ['flex-col '],
            false: ['items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end'],
        },
    },
    defaultVariants: {
        vertical: 'false',
    },
})

export function RequestItem({ vertical }: { vertical?: boolean }) {
    return (
        <div className={cn(itemVariants({ vertical: vertical ? 'true' : 'false' }))}>
            <div>
                <Label.sm>Request name</Label.sm>
                <Paragraph.sm className="text-tertiary">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.</Paragraph.sm>
            </div>
            <div className="max-w-xl flex items-center gap-2 flex-wrap">
                <Badge label="Urgent" icon={<Dot />} />
                <Badge label="Urgent" icon={<Dot />} />
                <Badge label="Urgent" icon={<Dot />} />
            </div>
        </div>
    )
}