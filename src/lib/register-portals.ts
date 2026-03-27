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
      { id: 'all', label: 'All Requests', path: '' },
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
      { id: 'assignments', label: 'Assignments', path: '/assignments' },
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
      { id: 'live', label: 'Live', path: '/live' },
      { id: 'scheduled', label: 'Scheduled', path: '/scheduled' },
      { id: 'history', label: 'History', path: '/history' },
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
