import { Badge } from "@moc/ui/components/display/badge"
import { TelegramIcon } from "@moc/ui/components/display/telegram-icon"

type TelegramLinkedBadgeProps = {
  linked: boolean
}

export function TelegramLinkedBadge({ linked }: TelegramLinkedBadgeProps) {
  if (!linked) return <Badge label="Not linked" color="gray" />
  return <Badge label="Linked" color="blue" icon={<TelegramIcon />} />
}
