import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { errText, post } from '../lib/api'
import { useSession } from '../lib/session'
import { markLogin } from '../lib/welcome'
import { AuthLayout } from './AuthLayout'
import { SocialButtons } from './Social'
import { safeNext } from './Guard'

/* The sign-in form on its own, so the home page can put it first. */
export function LoginPanel({ next, autoFocus = false }: { next: string | null; autoFocus?: boolean }) {
  const nav = useNavigate()
  const { refresh } = useSession()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const f = new FormData(e.currentTarget)
    setBusy(true); setErr('')
    try {
      await post('/account/login', { email: f.get('email'), password: f.get('password') })
      markLogin(); await refresh()
      nav(next ?? '/home', { replace: true })
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }

  /* Local testing only: this block is removed from production builds. */
  async function demo(who: 'studio' | 'client') {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const r = await post<{ studio: { email: string; password: string }; client: { email: string; password: string } }>('/dev/demo')
      await post('/account/login', r[who])
      markLogin(); await refresh()
      nav(who === 'studio' ? '/studio' : '/slip', { replace: true })
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }

  return (
    <>
      <SocialButtons />
      <form className="au-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" required autoFocus={autoFocus} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        {err && <p className="au-err" role="alert">{err}</p>}
        <Button variant="primary" type="submit" block disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</Button>
        <Link to="/forgot" className="au-link">Forgot your password?</Link>
      </form>
      {import.meta.env.DEV && (
        <div className="demo" role="group" aria-label="Local testing">
          <p className="hint">Local testing only. One tap, no typing.</p>
          <Button block disabled={busy} onClick={() => demo('studio')}>Try as demo business (Studio)</Button>
          <Button block disabled={busy} onClick={() => demo('client')}>Try as demo client (Slip)</Button>
        </div>
      )}
    </>
  )
}

export default function Login() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  return (
    <AuthLayout title="Welcome back" lead="Sign in to see your invoices." foot={<>New here? <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></>}>
      <LoginPanel next={next} autoFocus />
    </AuthLayout>
  )
}
