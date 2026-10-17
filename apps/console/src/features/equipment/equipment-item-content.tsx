import { MapPin, Tag } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Equipment } from '@moc/types/equipment'
import { EquipmentThumbnail } from './equipment-thumbnail'

export function EquipmentItemContent({ equipment }: { equipment: Equipment }) {
    return (
        <ListItemCard.Root>
            <ListItemCard.Leading>
                <EquipmentThumbnail equipment={equipment} />
            </ListItemCard.Leading>
            <ListItemCard.Content>
                <ListItemCard.Title>{equipment.name}</ListItemCard.Title>
                {equipment.serialNumber && <ListItemCard.Subtitle className="font-mono">{equipment.serialNumber}</ListItemCard.Subtitle>}
            </ListItemCard.Content>
            <ListItemCard.Trailing>
                <ListItemCard.Meta>
                    <ListItemCard.MetaItem icon={<Tag />}>{equipment.category}</ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<MapPin />}>{equipment.location}</ListItemCard.MetaItem>
                </ListItemCard.Meta>
            </ListItemCard.Trailing>
        </ListItemCard.Root>
    )
}
