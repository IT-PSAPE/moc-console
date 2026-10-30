import { Button } from '../controls/button'
import { Spinner } from './spinner'
import { Notification } from './notification'

type RetryNotificationProps = {
    title: string
    description: string
    onRetry: () => void
    isRetrying?: boolean
    retryLabel?: string
}

export function RetryNotification({ title, description, onRetry, isRetrying = false, retryLabel = 'Retry' }: RetryNotificationProps) {
    return (
        <Notification
            variant="error"
            title={title}
            description={description}
            action={(
                <Button variant="secondary" size="sm" onClick={onRetry} disabled={isRetrying} aria-busy={isRetrying || undefined}>
                    {isRetrying ? <Spinner size="sm" /> : null}
                    {isRetrying ? 'Retrying…' : retryLabel}
                </Button>
            )}
        />
    )
}
