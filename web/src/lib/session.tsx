import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { get, post } from './api'
import type { Me } from './types'

type Ctx = { me: Me | null; ready: boolean; refresh: () => Promise<void>; logout: () => Promise<void> }
const SessionCtx = createContext<Ctx>({ me: null, ready: false, refresh: async () => {}, logout: async () => {} })
export const useSession = () => useContext(SessionCtx)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const refresh = useCallback(async () => {
    try { setMe(await get<Me>('/account/me')) } catch { setMe({ user: null }) } finally { setReady(true) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const logout = useCallback(async () => { await post('/account/logout').catch(() => {}); setMe({ user: null }) }, [])
  const value = useMemo(() => ({ me, ready, refresh, logout }), [me, ready, refresh, logout])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}
