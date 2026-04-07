
// ─── Search Command Menu ─────────────────────────────────

import { Sidebar } from "@/components/navigation/sidebar"
import { CommandMenu, useCommandMenu } from "@/components/overlays/command-menu"
import { routes } from "@/screens/console-routes"
import { Cast, Drama, FileText, LayoutGrid, Package, Search } from "lucide-react"
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
    { group: 'Requests', label: 'Request Reports', route: routes.requestsReports, icon: <FileText className="size-4" /> },
    { group: 'Equipment', label: 'Equipment Overview', route: routes.equipmentOverview, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Inventory', route: routes.equipmentInventory, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Bookings', route: routes.equipmentBookings, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Maintenance', route: routes.equipmentMaintenance, icon: <Package className="size-4" /> },
    { group: 'Equipment', label: 'Equipment Reports', route: routes.equipmentReports, icon: <Package className="size-4" /> },
    { group: 'Broadcast', label: 'Broadcast Overview', route: routes.broadcastOverview, icon: <Cast className="size-4" /> },
    { group: 'Broadcast', label: 'Media', route: routes.broadcastMedia, icon: <Cast className="size-4" /> },
    { group: 'Broadcast', label: 'Playlists', route: routes.broadcastPlaylists, icon: <Cast className="size-4" /> },
    { group: 'Cue Sheet', label: 'Cue Sheet Overview', route: routes.cueSheetOverview, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Checklists', route: routes.cueSheetChecklists, icon: <Drama className="size-4" /> },
    { group: 'Cue Sheet', label: 'Events', route: routes.cueSheetEvents, icon: <Drama className="size-4" /> },
] as const

export function SearchCommandMenuContent() {
    const navigate = useNavigate()
    const { state } = useCommandMenu()
    const query = state.search.toLowerCase()

    const filtered = query
        ? searchablePages.filter(page => page.label.toLowerCase().includes(query) || page.group.toLowerCase().includes(query))
        : searchablePages

    const groups = filtered.reduce<Record<string, typeof filtered>>((acc, page) => {
        const group = page.group
        if (!acc[group]) {
            acc[group] = []
        }
        acc[group].push(page)
        return acc
    }, {})

    return (
        <CommandMenu.Portal>
            <CommandMenu.Backdrop />
            <CommandMenu.Panel>
                <CommandMenu.Input placeholder="Search pages..." />
                <CommandMenu.List>
                    {filtered.length === 0 && <CommandMenu.Empty />}
                    {Object.entries(groups).map(([group, pages]) => (
                        <CommandMenu.Group key={group} heading={group}>
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
