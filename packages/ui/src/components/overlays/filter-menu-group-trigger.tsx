import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Indicator } from '../display/indicator'
import { Dropdown } from './dropdown'
import { useFilterMenuGroup } from './filter-menu-context'

export function FilterMenuGroupTrigger({ children, icon }: { children: ReactNode; icon: ReactNode }) {
    const { state } = useFilterMenuGroup()
    return <Dropdown.SubmenuTrigger className="group" aria-description={state.active ? "Filter applied" : undefined}><span className="flex min-w-0 flex-1 items-center gap-2"><span className="shrink-0 text-tertiary [&>svg]:size-4">{icon}</span><span className="min-w-0 flex-1 truncate">{children}</span><Indicator.Dot color="brand" aria-hidden="true" className={state.active ? undefined : "opacity-0"} /><ChevronRight className="size-4 shrink-0 text-tertiary opacity-0 group-hover:opacity-100 group-data-[highlighted]:opacity-100 group-focus-visible:opacity-100" /></span></Dropdown.SubmenuTrigger>
}
