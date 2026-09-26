import { useLayoutEffect } from 'react'

export function useSystemTheme() {
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function applySystemTheme() {
      document.documentElement.dataset.theme = mediaQuery.matches ? 'dark' : 'light'
    }

    applySystemTheme()
    mediaQuery.addEventListener('change', applySystemTheme)

    return function stopObservingSystemTheme() {
      mediaQuery.removeEventListener('change', applySystemTheme)
    }
  }, [])
}
