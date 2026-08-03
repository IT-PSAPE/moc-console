import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { statusGroups } from "@moc/types/requests";
import { ResponsiveDetailAction } from "@/features/responsive-detail-action";
import { routes } from "@/screens/console-routes";
import { RequestItemContent } from "./request-item-content";

export function RequestListView({ onSelect, requests }: { onSelect: (request: Request) => void; requests: Request[] }) {
    function renderRequest(request: Request) {
        function handleSelect() {
            onSelect(request)
        }

        return (
            <ResponsiveDetailAction.Card key={request.id} mobileHref={`/${routes.requests}/${request.id}`} onActivate={handleSelect}>
                <RequestItemContent request={request} />
            </ResponsiveDetailAction.Card>
        )
    }

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
                            {items.map(renderRequest)}
                        </GroupedList.Content>
                    </GroupedList.Group>
                );
            })}
        </GroupedList>
    )
}
