import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useQueryText(queryKey = 'q') {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(queryKey) ?? ''

  const setValue = useCallback((nextValue: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    const trimmedValue = nextValue.trim()
    if (trimmedValue) nextSearchParams.set(queryKey, nextValue)
    else nextSearchParams.delete(queryKey)
    setSearchParams(nextSearchParams, { replace: true })
  }, [queryKey, searchParams, setSearchParams])

  return [value, setValue] as const
}
