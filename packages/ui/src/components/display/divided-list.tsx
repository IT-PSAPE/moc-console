import type { ReactNode } from 'react'
import { GroupedList } from './grouped-list'

type DividedListProps = { children: ReactNode; className?: string }

export function DividedList({ children, className }: DividedListProps) {
    return (
        <GroupedList.Group className={className}>
            <GroupedList.Content>
                {children}
            </GroupedList.Content>
        </GroupedList.Group>
    )
}
