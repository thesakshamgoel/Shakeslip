import { useCallback, useEffect, useState } from 'react'
import { api, errText } from './api'

/* Loads data and keeps the old data on screen while refreshing (no flashing spinners). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!path)
  const load = useCallback(async (quiet = false) => {
    if (!path) return
    try { setData(await api<T>('GET', path, undefined, quiet)); setError('') } catch (e) { setError(errText(e)) } finally { setLoading(false) }
  }, [path])
  useEffect(() => { setLoading(!!path); void load() }, [load, path])
  /* Stay fresh without a manual refresh: refetch every 30 seconds and when the tab comes back into view. */
  /* pull to refresh (and anything else) can ask every list to reload */
  useEffect(() => {
    if (!path) return
    const on = () => void load(true)
    window.addEventListener('ss-refresh', on)
    return () => window.removeEventListener('ss-refresh', on)
  }, [load, path])
  useEffect(() => {
    if (!path) return
    const tick = () => { if (document.visibilityState === 'visible') void load(true) }
    const id = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [load, path])
  return { data, error, loading, reload: () => load(), setData }
}
