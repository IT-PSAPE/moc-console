// A menu or select can open its containing drawer on mousedown. Its backdrop
// then receives the release of that same press, rather than a new outside press.
export function isOpeningTriggerPress(event: Event, trigger: HTMLElement | null, hasNewPointerPress: boolean): boolean {
    if (!trigger || hasNewPointerPress || event.type !== 'click') return false
    if (event.target === trigger || event.composedPath().includes(trigger)) return true
    if (!('clientX' in event) || !('clientY' in event) || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return false

    const bounds = trigger.getBoundingClientRect()
    return bounds.width > 0 && bounds.height > 0
        && event.clientX >= bounds.left && event.clientX <= bounds.right
        && event.clientY >= bounds.top && event.clientY <= bounds.bottom
}
