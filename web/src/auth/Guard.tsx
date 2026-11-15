import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../lib/session'

const Blank = () => <div style={{ minHeight: '100dvh' }} aria-busy="true" />

export function RequireAuth() {
  const { me, ready } = useSession()
  const loc = useLocation()
  if (!ready) return <Blank />
  if (!me?.user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <Outlet />
}

/* Studio needs a business set up. Everyone else is sent to the friendly setup screen first. */
export function RequireStudio() {
  const { me } = useSession()
  if (!me?.business) return <Navigate to="/studio/setup" replace />
  return <Outlet />
}

export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null)
