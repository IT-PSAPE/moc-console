const pendingOperations = new Map<string, Promise<void>>()

export function queueZoomMeetingOperation<T>(workspaceId: string, operation: () => Promise<T>): Promise<T> {
  const previous = pendingOperations.get(workspaceId) ?? Promise.resolve()
  const result = previous.then(operation)
  const settled = result.then(() => undefined, () => undefined)

  pendingOperations.set(workspaceId, settled)
  void settled.finally(() => {
    if (pendingOperations.get(workspaceId) === settled) {
      pendingOperations.delete(workspaceId)
    }
  })

  return result
}
