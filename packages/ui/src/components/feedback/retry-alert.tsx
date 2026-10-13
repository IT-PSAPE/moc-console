import { Button } from '@moc/ui/components/controls/button'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { Alert } from './alert'

type RetryAlertProps = {
    title: string
    description: string
    onRetry: () => void
    isRetrying?: boolean
    retryLabel?: string
}

export function RetryAlert({ title, description, onRetry, isRetrying = false, retryLabel = 'Retry' }: RetryAlertProps) {
    return (
        <Alert
            variant="error"
            title={title}
            description={description}
            action={(
                <Button variant="secondary" onClick={onRetry} disabled={isRetrying} aria-busy={isRetrying || undefined}>
                    {isRetrying ? <Spinner size="sm" /> : null}
                    {isRetrying ? 'Retrying…' : retryLabel}
                </Button>
            )}
        />
    )
}
