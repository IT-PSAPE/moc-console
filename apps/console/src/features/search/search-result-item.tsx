import { CalendarCheck, FileText, LayoutGrid, Package, Radio } from 'lucide-react'
import { CommandMenu } from '@moc/ui/components/overlays/command-menu'
import type { SearchResult, SearchResultKind } from './use-search-command'

type SearchResultItemProps = {
    item: SearchResult
    onSelect: (item: SearchResult) => void
}

function resultIcon(kind: SearchResultKind) {
    const className = 'size-4'
    if (kind === 'dashboard') return <LayoutGrid className={className} />
    if (kind === 'request') return <FileText className={className} />
    if (kind === 'equipment') return <Package className={className} />
    if (kind === 'booking') return <CalendarCheck className={className} />
    return <Radio className={className} />
}

export function SearchResultItem({ item, onSelect }: SearchResultItemProps) {
    function handleSelect() {
        onSelect(item)
    }

    return (
        <CommandMenu.Item value={item.label} onSelect={handleSelect}>
            {resultIcon(item.kind)}
            <div className="flex min-w-0 flex-col">
                <span className="truncate">{item.label}</span>
                {item.description && <span className="truncate text-xs text-quaternary">{item.description}</span>}
            </div>
        </CommandMenu.Item>
    )
}
