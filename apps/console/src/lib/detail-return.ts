export function resolveDetailReturn(state: unknown, fallbackHref: string): string {
    if (!state || typeof state !== 'object' || !('returnTo' in state)) return fallbackHref
    const value = state.returnTo
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallbackHref
    return value
}
