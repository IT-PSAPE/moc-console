import { Search } from 'lucide-react'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { useCommandMenu } from '@moc/ui/components/overlays/command-menu'

export function SearchMenuItem() {
    const { actions } = useCommandMenu()
    return <Sidebar.MenuItem title="Search" icon={<Search />} onClick={actions.open} />
}
