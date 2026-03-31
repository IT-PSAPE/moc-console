import { Card } from "@/components/display/card";
import { Indicator } from "@/components/display/indicator";
import { RequestItem } from "./request-item";
import { Label } from "@/components/display/text";
import type { Request } from "@/types/requests";

const statusGroups = [
    { key: "not_started", label: "Not Started", color: "red" },
    { key: "in_progress", label: "In Progress", color: "yellow" },
    { key: "completed", label: "Completed", color: "green" },
] as const;

export function RequestKanban({ requests }: { requests: Request[] }) {
    return (
        <div className='flex gap-3 p-4 pt-0 mx-auto w-full max-w-content *:flex-1 *:min-w-sm'>
            {statusGroups.map((group) => {
                const items = requests.filter((r) => r.status === group.key);
                return (
                    <Card.Root key={group.key}>
                        <Card.Header className='gap-1.5'>
                            <Indicator color={group.color} className='size-6' />
                            <Label.sm>{group.label}</Label.sm>
                        </Card.Header>
                        <Card.Content ghost className='flex flex-col gap-1.5'>
                            {items.map((r) => (
                                <RequestItem key={r.id} request={r} vertical />
                            ))}
                        </Card.Content>
                    </Card.Root>
                );
            })}
        </div>
    )
}
