import { useLayoutEffect, useRef } from 'react'

export function useDiscussionCommentScroll(count: number, newestId: string | null, active: boolean) {
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const previous = useRef<{ element: HTMLDivElement; height: number; newestId: string | null } | null>(null)
    const olderPosition = useRef<{ height: number; top: number } | null>(null)
    const followNext = useRef(false)

    function preserveOlderPosition(): void {
        const element = viewportRef.current
        if (element) olderPosition.current = { height: element.scrollHeight, top: element.scrollTop }
    }

    function followLatest(): void { followNext.current = true }

    useLayoutEffect(() => {
        const element = viewportRef.current
        if (!element || !active) return
        const last = previous.current
        if (olderPosition.current) {
            element.scrollTop = olderPosition.current.top + element.scrollHeight - olderPosition.current.height
            olderPosition.current = null
        } else if (followNext.current || last?.element !== element || (last.newestId !== newestId && last.height - element.scrollTop - element.clientHeight < 80)) {
            element.scrollTop = element.scrollHeight
        }
        followNext.current = false
        previous.current = { element, height: element.scrollHeight, newestId }
    }, [active, count, newestId])

    return { viewportRef, preserveOlderPosition, followLatest }
}
