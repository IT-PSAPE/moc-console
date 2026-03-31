import { Dot } from "lucide-react";
import { Label, Paragraph } from "../../components/display/text";
import { Badge } from "../../components/display/badge";
import { Drawer } from "../../components/overlays/drawer";
import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";
import type { Request } from "@/types/requests";
import { priorityColor, categoryLabel } from "@/types/requests";
import { RequestDrawer } from "./request-drawer";

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

export function RequestItem({ request, vertical }: { request: Request; vertical?: boolean }) {
    return (
        <Drawer.Root>
            <Drawer.Trigger>
                <div className={cn(itemVariants({ vertical: vertical ? 'true' : 'false' }), 'cursor-pointer hover:bg-background-primary-hover transition-colors')}>
                    <div>
                        <Label.sm>{request.title}</Label.sm>
                        <Paragraph.sm className="text-tertiary">{request.what}</Paragraph.sm>
                    </div>
                    <div className="max-w-xl flex items-center gap-2 flex-wrap">
                        <Badge
                            label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                            icon={<Dot />}
                            color={priorityColor[request.priority]}
                        />
                        <Badge label={categoryLabel[request.category]} icon={<Dot />} />
                        {request.dueDate && (
                            <Badge
                                label={new Date(request.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                variant="outline"
                            />
                        )}
                    </div>
                </div>
            </Drawer.Trigger>
            <RequestDrawer request={request} />
        </Drawer.Root>
    )
}
