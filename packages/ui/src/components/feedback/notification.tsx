import type { NotificationProps } from './feedback-types'
import { useNotification } from './use-notification'

export function Notification({ title, description, variant, action, dismissible, onClose, duration }: NotificationProps) {
    useNotification({ title, description, variant, action, dismissible, onClose, duration })
    return null
}
