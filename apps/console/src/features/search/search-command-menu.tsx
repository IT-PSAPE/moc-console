import { CommandMenu, useCommandMenu } from '@moc/ui/components/overlays/command-menu'
import { useSearchCommand, type SearchResult, type SearchResultGroup } from './use-search-command'
import { SearchResultItem } from './search-result-item'

export function SearchCommandMenuContent() {
    const { state: commandMenuState } = useCommandMenu()
    const { state, actions } = useSearchCommand(commandMenuState.isOpen, commandMenuState.search)

    function renderResult(item: SearchResult) {
        return <SearchResultItem key={item.id} item={item} onSelect={actions.selectResult} />
    }

    function renderGroup(group: SearchResultGroup) {
        return (
            <CommandMenu.Group key={group.label} heading={group.label}>
                {group.results.map(renderResult)}
            </CommandMenu.Group>
        )
    }

    return (
        <CommandMenu.Portal>
            <CommandMenu.Backdrop />
            <CommandMenu.Panel>
                <CommandMenu.Input placeholder="Search pages and items…" />
                <CommandMenu.List>
                    {!state.hasResults && <CommandMenu.Empty />}
                    {state.groups.map(renderGroup)}
                </CommandMenu.List>
            </CommandMenu.Panel>
        </CommandMenu.Portal>
    )
}
