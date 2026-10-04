import { moc } from "@/lib/moc-client"
import type { MiniAppRequest, MiniAppResponse } from "@moc/notifications"
import { parseMiniAppResponse } from "@moc/sdk"

export { parseMiniAppResponse }

/** POSTs a Mini App request to the API and parses its MiniAppResponse. Never throws. */
export async function postTelegramMiniApp(request: MiniAppRequest): Promise<MiniAppResponse> {
  return moc.telegramMiniApp.send(request)
}
