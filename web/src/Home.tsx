import { Navigate } from 'react-router-dom'
import { useSession } from './lib/session'

const lastFor = (app: string) => { try { const v = localStorage.getItem(`ss-last-${app}`) ?? ''; return v.startsWith(`/${app}`) ? v : `/${app}` } catch { return `/${app}` } }

/* After signing in: straight to where you were. The welcome greeting plays inside the app. */
export default function Home() {
  const { me, ready } = useSession()
  if (!ready) return <div style={{ minHeight: '100dvh' }} aria-busy="true" />
  if (!me?.user) return <Navigate to="/" replace />
  return <Navigate to={me.business ? lastFor('studio') : lastFor('slip')} replace />
}
