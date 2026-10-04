import type { MiniAppErrorCode, MiniAppRequest, MiniAppResponse } from "@moc/notifications";
import type { MocTransport } from "./transport";

const ERROR_CODES: ReadonlySet<MiniAppErrorCode> = new Set(["unauthorized", "not_linked", "forbidden", "not_found", "invalid_transition", "invalid"]);

const UNREACHABLE_RESPONSE: MiniAppResponse = {
  ok: false,
  error: "invalid",
  message: "Could not reach the server. Check your connection and try again.",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMiniAppResponse(status: number, body: unknown): MiniAppResponse {
  if (isObject(body) && body.ok === true && isObject(body.detail) && isObject(body.viewer)) {
    return body as MiniAppResponse;
  }
  if (isObject(body) && body.ok === false && ERROR_CODES.has(body.error as MiniAppErrorCode)) {
    return { ok: false, error: body.error as MiniAppErrorCode, message: typeof body.message === "string" ? body.message : "" };
  }
  const message = status === 429 ? "Too many taps — wait a moment and try again." : "Something went wrong. Please try again.";
  return { ok: false, error: "invalid", message };
}

export function createTelegramMiniAppClient(transport: MocTransport) {
  return {
    async send(request: MiniAppRequest): Promise<MiniAppResponse> {
      try {
        const response = await transport.request<Response>("/api/telegram/mini-app", { method: "POST", json: request, responseType: "response" });
        const body: unknown = await response.json().catch(() => null);
        return parseMiniAppResponse(response.status, body);
      } catch {
        return UNREACHABLE_RESPONSE;
      }
    },
  };
}

export type TelegramMiniAppClient = ReturnType<typeof createTelegramMiniAppClient>;
