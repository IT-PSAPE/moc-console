import { useSearchParams } from "react-router-dom";

export function useViewQuery<const T extends string>(views: readonly T[], defaultView: T, queryKey = "view") {
  const [searchParams, setSearchParams] = useSearchParams();
  const candidate = searchParams.get(queryKey);
  const view = candidate && views.includes(candidate as T) ? candidate as T : defaultView;

  function setView(nextView: string) {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextView === defaultView) nextSearchParams.delete(queryKey);
    else nextSearchParams.set(queryKey, nextView);
    setSearchParams(nextSearchParams, { replace: true });
  }

  return [view, setView] as const;
}
