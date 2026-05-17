import { Image, Music, Video } from "lucide-react"
import type { MediaType } from "@moc/types/broadcast"

export const mediaTypeIcon: Record<MediaType, React.ReactNode> = {
  image: <Image />,
  audio: <Music />,
  video: <Video />,
}
