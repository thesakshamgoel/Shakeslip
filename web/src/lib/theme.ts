import { useCallback, useState } from 'react'

export type ThemeName = 'dark' | 'light'
const KEY = 'ss-theme'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => (document.documentElement.dataset.theme as ThemeName) || 'dark')
  const toggle = useCallback(() => {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
    try { localStorage.setItem(KEY, next) } catch { /* storage may be blocked; theme still applies */ }
    setTheme(next)
  }, [theme])
  return { theme, toggle }
}
