import { FileText, Package, Radio, ListMusic } from 'lucide-react'
import { registerPortal } from './portal-registry'
import { RequestsPortal } from '@/components/portals/requests'
import { EquipmentPortal } from '@/components/portals/equipment'
import { BroadcastingPortal } from '@/components/portals/broadcasting'
import { CueSheetPortal } from '@/components/portals/cue-sheet'

export function registerAllPortals() {
  registerPortal({
    id: 'requests',
    label: 'Requests',
    icon: FileText,
    basePath: '/requests',
    component: RequestsPortal,
    sections: [
      { id: 'overview', label: 'Overview', path: '' },
      { id: 'all', label: 'All Requests', path: '/all' },
      { id: 'archive', label: 'Archive', path: '/archive' },
      { id: 'insights', label: 'Insights', path: '/insights' },
    ],
  })

  registerPortal({
    id: 'equipment',
    label: 'Equipment',
    icon: Package,
    basePath: '/equipment',
    component: EquipmentPortal,
    sections: [
      { id: 'overview', label: 'Overview', path: '' },
      { id: 'inventory', label: 'Inventory', path: '/inventory' },
      { id: 'bookings', label: 'Bookings', path: '/bookings' },
      { id: 'maintenance', label: 'Maintenance', path: '/maintenance' },
      { id: 'reports', label: 'Reports', path: '/reports' },
    ],
  })

  registerPortal({
    id: 'broadcasting',
    label: 'Broadcasting',
    icon: Radio,
    basePath: '/broadcasting',
    component: BroadcastingPortal,
    sections: [
      { id: 'overview', label: 'Overview', path: '' },
      { id: 'media-bin', label: 'Media Bin', path: '/media-bin' },
      { id: 'broadcasts', label: 'Broadcasts', path: '/broadcasts' },
    ],
  })

  registerPortal({
    id: 'cue-sheet',
    label: 'Cue Sheet',
    icon: ListMusic,
    basePath: '/cue-sheet',
    component: CueSheetPortal,
    sections: [
      { id: 'events', label: 'Events', path: '' },
      { id: 'timeline', label: 'Timeline', path: '' },
    ],
  })
}
