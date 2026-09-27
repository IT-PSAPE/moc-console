// Public entry point for rich-message HTML conversion (Bot API 10.3
// sendRichMessage / editMessageText rich_message). Implementations live
// in telegram-rich-html.ts and telegram-rich-legacy.ts to keep each file
// under the utility size limit; this module just re-exports the stable
// interface other agents/apps import.

export { toRichHtml } from "./telegram-rich-html.js";
export { toLegacyHtml } from "./telegram-rich-legacy.js";
