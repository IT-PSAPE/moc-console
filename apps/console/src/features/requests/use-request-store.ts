import { updateRequest } from "@/data/mutate-requests";
import { useEditableStore } from "@/hooks/use-editable-store";
import type { Request } from "@moc/types/requests";

type UseRequestStoreOptions = {
  syncRequest?: (request: Request) => void;
};

function prepareRequest(request: Request) {
  return { ...request, updatedAt: new Date().toISOString() };
}

export function useRequestStore(initialRequest: Request, options?: UseRequestStoreOptions) {
  return useEditableStore(initialRequest, {
    persist: updateRequest,
    errorMessage: "Request could not be saved. Please review the request details and try again.",
    sync: options?.syncRequest,
    prepare: prepareRequest,
  });
}
