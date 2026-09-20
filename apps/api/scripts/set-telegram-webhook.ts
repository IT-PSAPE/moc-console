/**
 * Point the Telegram bot's webhook at this API.
 *
 * Telegram only ever calls one URL per bot. When the API moves hosts (as it
 * did when the server code left the console), every `/start` and group
 * command silently dies against the old URL until this is re-run.
 *
 *   bun run telegram:webhook                  # defaults to the production API
 *   bun run telegram:webhook https://host     # any other base URL
 *   bun run telegram:webhook --info           # only print getWebhookInfo
 *
 * Bun loads `.env.local` automatically, so TELEGRAM_BOT_TOKEN and
 * TELEGRAM_WEBHOOK_SECRET come from there. The secret must match the one the
 * deployed API checks, or every update is rejected with 401.
 */

const DEFAULT_API_BASE_URL = "https://api.psape.co.za"
const ALLOWED_UPDATES = ["message", "edited_message", "my_chat_member"]

const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
if (!token || !secret) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be set (see .env.example).")
  process.exit(1)
}

const args = process.argv.slice(2)
const infoOnly = args.includes("--info")
const baseUrl = (args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "")
const webhookUrl = `${baseUrl}/api/telegram/webhook`

async function telegram(method: string, body?: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.json()
}

if (!infoOnly) {
  const result = await telegram("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ALLOWED_UPDATES,
    max_connections: 40,
  })
  console.log("setWebhook", webhookUrl)
  console.log(JSON.stringify(result))
}

console.log("getWebhookInfo")
console.log(JSON.stringify(await telegram("getWebhookInfo"), null, 2))
