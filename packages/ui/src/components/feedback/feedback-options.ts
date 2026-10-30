import type { FeedbackVariant } from './alert'

export function feedbackDuration(variant: FeedbackVariant = 'info', duration?: number, hasAction = false): number {
    return duration ?? (hasAction || variant === 'error' || variant === 'warning' ? 0 : 4000)
}
