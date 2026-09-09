import type { RequestFormData } from "@/types/request";

const REQUEST_DRAFT_STORAGE_KEY = "moc-request-public-draft-v1";

export type StoredRequestDraft = {
  step: number;
  data: RequestFormData;
};

const EMPTY_REQUEST_DRAFT: RequestFormData = {
  title: "",
  requestedBy: "",
  priority: "medium",
  dueDate: "",
  category: "video_production",
  who: "",
  what: "",
  whenText: "",
  whereText: "",
  why: "",
  how: "",
  notes: "",
  flow: "",
};

function isRequestFormData(value: unknown): value is RequestFormData {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;
  return Object.keys(EMPTY_REQUEST_DRAFT).every((key) => typeof data[key] === "string");
}

function isStoredRequestDraft(value: unknown): value is StoredRequestDraft {
  if (!value || typeof value !== "object") return false;

  const draft = value as Record<string, unknown>;
  return typeof draft.step === "number" && draft.step >= 1 && draft.step <= 4 && isRequestFormData(draft.data);
}

function isInProgress(draft: StoredRequestDraft): boolean {
  return draft.step > 1 || Object.entries(draft.data).some(([key, value]) => value !== EMPTY_REQUEST_DRAFT[key as keyof RequestFormData]);
}

export function getEmptyRequestDraft(): RequestFormData {
  return { ...EMPTY_REQUEST_DRAFT };
}

export function loadRequestDraft(): StoredRequestDraft | null {
  try {
    const raw = window.localStorage.getItem(REQUEST_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const draft: unknown = JSON.parse(raw);
    return isStoredRequestDraft(draft) && isInProgress(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function saveRequestDraft(draft: StoredRequestDraft): void {
  try {
    if (!isInProgress(draft)) {
      clearRequestDraft();
      return;
    }

    window.localStorage.setItem(REQUEST_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Draft persistence is an enhancement; submission remains available when
    // storage is unavailable or full.
  }
}

export function clearRequestDraft(): void {
  try {
    window.localStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
  } catch {
    // No further action is possible when storage is unavailable.
  }
}
