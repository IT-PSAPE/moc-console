
// ─── Search Command Menu ─────────────────────────────────

import { Sidebar } from "@/components/navigation/sidebar"
import { CommandMenu, useCommandMenu } from "@/components/overlays/command-menu"
import { fetchRequests } from "@/data/fetch-requests"
import { fetchEquipment } from "@/data/fetch-equipment"
import { fetchMedia, fetchPlaylists } from "@/data/fetch-broadcast"
import { fetchCueSheetEvents, fetchCueSheetChecklists } from "@/data/fetch-cue-sheet"
import { routes } from "@/screens/console-routes"
import type { Request } from "@/types/requests"
import type { Equipment } from "@/types/equipment"
import type { MediaItem, Playlist } from "@/types/broadcast"
import type { CueSheetEvent, Checklist } from "@/types/cue-sheet"
import { Cast, Calendar, ClipboardList, Drama, FileText, LayoutGrid, ListMusic, Package, Film, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

export function SearchMenuItem() {
    const { actions } = useCommandMenu()
    return <Sidebar.MenuItem title={"Search"} icon={<Search />} onClick={actions.open} />
}

const searchablePages = [
    { group: 'General', label: 'Dashboard', route: routes.dashboard, icon: <LayoutGrid className="size-4" /> },
    { group: 'Requests', label: 'Requests Overview', route: routes.requestsOverview, icon: <FileText className="size-4" /> },
    { group: 'Requests', label: 'All Requests', route: routes.requestsAllRequests, icon: <FileText className="size-4" /> },
    { group: 'Requests', label: 'Archived Requests', route: routes.requestsArchived, icon: <FileText className="size-4" /> },
    { group: 'Equipment', label: 'Equipment Overview', route: routes.equipmentOverview, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Inventory', route: routes.equipmentInventory, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Bookings', route: routes.equipmentBookings, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Maintenance', route: routes.equipmentMaintenance, icon: <Package className="size-4" /> },
    { group: 'Broadcast', label: 'Broadcast Overview', route: routes.broadcastOverview, icon: <Cast className="size-4" /> },
    { group: 'Broadcast', label: 'Media', route: routes.broadcastMedia, icon: <Cast className="size-4" /> },
    { group: 'Broadcast', label: 'Playlists', route: routes.broadcastPlaylists, icon: <Cast className="size-4" /> },
    { group: 'Cue Sheet', label: 'Cue Sheet Overview', route: routes.cueSheetOverview, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Checklists', route: routes.cueSheetChecklists, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Events', route: routes.cueSheetEvents, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Templates', route: routes.cueSheetTemplates, icon: <Drama className="size-4" /> },
] as const

type SearchablePage = (typeof searchablePages)[number]
type SearchablePageGroup = SearchablePage['group']

type SearchableItem = {
    id: string
    label: string
    description: string
    route: string
    group: string
    icon: React.ReactNode
}

function useSearchableItems(isOpen: boolean) {
    const [items, setItems] = useState<SearchableItem[]>([])
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!isOpen || loadedRef.current) return
        loadedRef.current = true

        async function load() {
            const [requests, equipment, media, playlists, events, checklists] = await Promise.all([
                fetchRequests().catch(() => [] as Request[]),
                fetchEquipment().catch(() => [] as Equipment[]),
                fetchMedia().catch(() => [] as MediaItem[]),
                fetchPlaylists().catch(() => [] as Playlist[]),
                fetchCueSheetEvents().catch(() => [] as CueSheetEvent[]),
                fetchCueSheetChecklists().catch(() => [] as Checklist[]),
            ])

            const searchable: SearchableItem[] = [
                ...requests.map((r) => ({
                    id: r.id,
                    label: r.title,
                    description: r.what,
                    route: `/${routes.requestsOverview}/${r.id}`,
                    group: 'Requests',
                    icon: <FileText className="size-4" />,
                })),
                ...equipment.map((e) => ({
                    id: e.id,
                    label: e.name,
                    description: e.location,
                    route: `/${routes.equipmentOverview}/${e.id}`,
                    group: 'Equipment',
                    icon: <Package className="size-4" />,
                })),
                ...media.map((m) => ({
                    id: m.id,
                    label: m.name,
                    description: m.type,
                    route: `/${routes.broadcastMedia}`,
                    group: 'Media',
                    icon: <Film className="size-4" />,
                })),
                ...playlists.map((p) => ({
                    id: p.id,
                    label: p.name,
                    description: p.description,
                    route: `/${routes.broadcastPlaylists}/${p.id}`,
                    group: 'Playlists',
                    icon: <ListMusic className="size-4" />,
                })),
                ...events.map((e) => ({
                    id: e.id,
                    label: e.title,
                    description: e.description,
                    route: `/${routes.cueSheetEvents}/${e.id}`,
                    group: 'Events',
                    icon: <Calendar className="size-4" />,
                })),
                ...checklists.map((c) => ({
                    id: c.id,
                    label: c.name,
                    description: c.description,
                    route: `/${routes.cueSheetChecklists}/${c.id}`,
                    group: 'Checklists',
                    icon: <ClipboardList className="size-4" />,
                })),
            ]

            setItems(searchable)
        }

        load()
    }, [isOpen])

    // Reset cache when menu closes so next open gets fresh data
    useEffect(() => {
        if (!isOpen) {
            loadedRef.current = false
        }
    }, [isOpen])

    return items
}

export function SearchCommandMenuContent() {
    const navigate = useNavigate()
    const { state } = useCommandMenu()
    const query = state.search.toLowerCase()

    const items = useSearchableItems(state.isOpen)

    // Filter pages
    const filteredPages = query
        ? searchablePages.filter(page => page.label.toLowerCase().includes(query) || page.group.toLowerCase().includes(query))
        : searchablePages

    const pageGroups: Partial<Record<SearchablePageGroup, SearchablePage[]>> = {}
    for (const page of filteredPages) {
        if (!pageGroups[page.group]) pageGroups[page.group] = []
        pageGroups[page.group]!.push(page)
    }

    // Filter items — only show when there's a query
    const filteredItems = query
        ? items
            .filter(item => item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query))
            .slice(0, 10)
        : []

    const itemGroups: Array<[string, SearchableItem[]]> = []
    const itemGroupMap: Record<string, SearchableItem[]> = {}

    for (const item of filteredItems) {
        if (!itemGroupMap[item.group]) {
            itemGroupMap[item.group] = []
            itemGroups.push([item.group, itemGroupMap[item.group]])
        }

        itemGroupMap[item.group].push(item)
    }

    const hasResults = filteredPages.length > 0 || filteredItems.length > 0

    return (
        <CommandMenu.Portal>
            <CommandMenu.Backdrop />
            <CommandMenu.Panel>
                <CommandMenu.Input placeholder="Search pages and items..." />
                <CommandMenu.List>
                    {!hasResults && <CommandMenu.Empty />}

                    {/* Item results — shown first when searching */}
                    {itemGroups.map(([group, groupItems]) => (
                        <CommandMenu.Group key={group} heading={group}>
                            {groupItems.map(item => (
                                <CommandMenu.Item key={item.id} value={item.label} onSelect={() => navigate(item.route)}>
                                    {item.icon}
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate">{item.label}</span>
                                        <span className="truncate text-xs text-quaternary">{item.description}</span>
                                    </div>
                                </CommandMenu.Item>
                            ))}
                        </CommandMenu.Group>
                    ))}

                    {/* Page results */}
                    {Object.entries(pageGroups).map(([group, pages]) => (
                        <CommandMenu.Group key={group} heading={query ? `${group} pages` : group}>
                            {pages.map(page => (
                                <CommandMenu.Item key={page.route} value={page.label} onSelect={() => navigate(`/${page.route}`)}>
                                    {page.icon}
                                    {page.label}
                                </CommandMenu.Item>
                            ))}
                        </CommandMenu.Group>
                    ))}
                </CommandMenu.List>
            </CommandMenu.Panel>
        </CommandMenu.Portal>
    )
}
