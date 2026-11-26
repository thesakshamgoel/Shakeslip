import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Account'
import { Button } from '../components/Button'
import { googleReady, googleSignIn, googleSignOut, watchGoogleUser, type GoogleUser } from '../lib/firebase'
import { PROVIDERS } from './Social'
import './auth.css'
import './social.css'

const GOOGLE = PROVIDERS[0]
const PROBLEMS: Record<string, string> = {
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/network-request-failed': 'We could not reach Google. Check your internet connection and try again.',
  'auth/unauthorized-domain': 'Google sign-in is not allowed on this address yet. (ERR-AUTH-DOMAIN)',
}
const problem = (e: unknown) => PROBLEMS[(e as { code?: string }).code ?? ''] ?? 'Google sign-in did not work. Please try again. (ERR-AUTH-GOOGLE)'

/* Sign-in for the preview build: Google only, with no server behind it. Used on the home card and as a full page. */
export function PreviewAccount({ page = false }: { page?: boolean }) {
  /* undefined while Firebase is still loading */
  const [user, setUser] = useState<GoogleUser | null | undefined>(googleReady ? undefined : null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!googleReady) return
    let stop: (() => void) | undefined, gone = false
    watchGoogleUser(setUser).then((s) => { if (gone) s(); else stop = s }).catch((e) => { setUser(null); setErr(problem(e)) })
    return () => { gone = true; stop?.() }
  }, [])

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setErr('')
    try { await action() } catch (e) { setErr(problem(e)) } finally { setBusy(false) }
  }

  const H = page ? 'h1' : 'h2'
  return (
    <>
      <H className={page ? 'land-h' : undefined}>{user ? 'You are signed in' : 'Sign in to Shakeslip'}</H>
      <p className={page ? 'land-p' : 'lp-login-lead'}>{user ? 'Studio, Slip and invoices open soon. There is nothing else to set up for now.' : 'This is a preview. You can sign in with Google now. Studio, Slip and invoices open soon.'}</p>
      <div className="pv">
        {user ? <>
          <div className="pv-who"><Avatar name={user.name} photo={user.photo} size={40} /><span><b>{user.name}</b><small>{user.email}</small></span></div>
          <Button block disabled={busy} onClick={() => run(googleSignOut)}>Sign out</Button>
        </> : <>
          <button type="button" className="soc-b tap" disabled={busy || user === undefined || !googleReady} aria-busy={busy || user === undefined} onClick={() => run(googleSignIn)}>{GOOGLE.icon}<span>{GOOGLE.label}</span></button>
          <p className="pv-note">Google shares your name, email and photo with our sign-in provider, Firebase. By continuing you agree to the <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>.</p>
        </>}
        {!googleReady && <p className="au-err" role="alert">Google sign-in is not set up on this preview. (ERR-AUTH-CONFIG)</p>}
        {err && <p className="au-err" role="alert">{err}</p>}
      </div>
    </>
  )
}
