import { createContext, useContext } from 'react'
import type { useItemDiscussion } from './use-item-discussion'

export const ItemDiscussionContext = createContext<ReturnType<typeof useItemDiscussion> | null>(null)

export function useItemDiscussionContext(): ReturnType<typeof useItemDiscussion> {
    const context = useContext(ItemDiscussionContext)
    if (!context) throw new Error('Discussion components must be used inside ItemDiscussionPanel.')
    return context
}
