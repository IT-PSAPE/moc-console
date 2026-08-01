import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { RequestItem } from "./request-item";
import { Label } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { statusGroups } from "@moc/types/requests";

export function RequestListView({ requests }: { requests: Request[] }) {
    return (
        <GroupedList>
            {statusGroups.map((group) => {
                const items = requests.filter((r) => r.status === group.key);
                if (items.length === 0) return null;
                return (
                    <GroupedList.Group key={group.key}>
                        <GroupedList.Header>
                            <Indicator color={group.color} className='size-6' />
                            <Label.sm>{group.label}</Label.sm>
                        </GroupedList.Header>
                        <GroupedList.Content>
                            {items.map((r) => (
                                <RequestItem key={r.id} request={r} />
                            ))}
                        </GroupedList.Content>
                    </GroupedList.Group>
                );
            })}
        </GroupedList>
    )
}
