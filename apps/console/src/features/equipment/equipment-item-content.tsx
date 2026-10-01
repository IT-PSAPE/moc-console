import { MapPin, Tag } from 'lucide-react'
import { Badge } from '@moc/ui/components/display/badge'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Equipment } from '@moc/types/equipment'

export function EquipmentItemContent({ equipment }: { equipment: Equipment }) {
    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <ListItemCard.Title className="min-w-0">{equipment.name}</ListItemCard.Title>
                    {equipment.serialNumber && <Badge label={equipment.serialNumber} color="gray" className="max-w-full font-mono [&>span]:truncate [&>span]:text-[10px]" />}
                </div>
                <ListItemCard.Meta>
                    <ListItemCard.MetaItem icon={<Tag />}>{equipment.category}</ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<MapPin />}>{equipment.location}</ListItemCard.MetaItem>
                </ListItemCard.Meta>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
