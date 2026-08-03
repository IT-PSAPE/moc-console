import { cn } from "@moc/utils/cn"

type StreamProvider = "youtube" | "zoom"

const providerAssets: Record<StreamProvider, { alt: string; src: string }> = {
  youtube: { alt: "YouTube", src: "/resources/logo/Youtube.svg" },
  zoom: { alt: "Zoom", src: "/resources/logo/Zoom.svg" },
}

export function StreamProviderIcon({ provider, decorative = false, className }: { provider: StreamProvider; decorative?: boolean; className?: string }) {
  const asset = providerAssets[provider]
  return <img src={asset.src} alt={decorative ? "" : asset.alt} className={cn("size-4 object-contain", className)} />
}
