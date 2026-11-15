import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { SlipIcon, StudioIcon } from '../brand/icons'
import { ApiError, errText, post } from '../lib/api'
import { useSession } from '../lib/session'
import { markLogin } from '../lib/welcome'
import { AuthLayout } from './AuthLayout'
import { SocialButtons } from './Social'
import { safeNext } from './Guard'

export default function Signup() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const nav = useNavigate()
  /* arriving from sign-in: an email with no account, or a Google account that is new here */
  const st = (useLocation().state ?? {}) as { email?: string; google?: { idToken: string; email?: string; name?: string } }
  const g = st.google
  const { refresh } = useSession()
  const [role, setRole] = useState<'studio' | 'slip'>(next?.startsWith('/join') || next?.startsWith('/c/') ? 'slip' : 'studio')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    if (!agree) { setErr('Please tick the box to accept the terms and privacy policy.'); return }
    const f = new FormData(e.currentTarget)
    setBusy(true); setErr('')
    try {
      const r = await post<{ next: string }>('/account/signup', { name: f.get('name'), email: f.get('email'), password: f.get('password'), role, acceptTerms: true })
      markLogin(); await refresh()
      nav(next ?? r.next, { replace: true })
    } catch (x) {
      /* that email already has an account: if the password is right, just sign in */
      if (x instanceof ApiError && x.status === 409) {
        try { await post('/account/login', { email: f.get('email'), password: f.get('password') }); markLogin(); await refresh(); nav(next ?? '/home', { replace: true }); return }
        catch { setErr('That email already has an account, and the password does not match. Try signing in, or reset your password.'); return }
      }
      setErr(errText(x))
    } finally { setBusy(false) }
  }

  /* a new Google account only needs a role and the terms */
  async function finishGoogle() {
    if (busy || !g) return
    if (!agree) { setErr('Please tick the box to accept the terms and privacy policy.'); return }
    setBusy(true); setErr('')
    try {
      const r = await post<{ next: string }>('/account/google', { idToken: g.idToken, role, acceptTerms: true })
      markLogin(); await refresh()
      nav(next ?? r.next, { replace: true })
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }

  return (
    <AuthLayout title={g ? `Welcome${g.name ? `, ${g.name.split(' ')[0]}` : ''}` : 'Create your account'} lead={g ? `No Shakeslip account for ${g.email ?? 'that Google email'} yet, so we will make one. Pick what brings you here.` : st.email ? 'No account for that email yet, so let us make one. It takes under a minute.' : 'It takes under a minute. You can use both Studio and Slip with one login.'} foot={<>Already have an account? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</Link></>}>
      <div className="roles" role="group" aria-label="What brings you here">
        <button type="button" className="role role-i tap" aria-pressed={role === 'studio'} onClick={() => setRole('studio')}><StudioIcon size={36} /><span><b>I send invoices</b><span>Studio, for my business or freelance work</span></span></button>
        <button type="button" className="role role-i tap" aria-pressed={role === 'slip'} onClick={() => setRole('slip')}><SlipIcon size={36} /><span><b>I receive invoices</b><span>Slip, my inbox for bills</span></span></button>
      </div>
      {g ? (
        <div className="au-form">
          <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I agree to the <Link to="/terms" target="_blank">terms</Link> and <Link to="/privacy" target="_blank">privacy policy</Link>.</span></label>
          {err && <p className="au-err" role="alert">{err}</p>}
          <Button variant="primary" block disabled={busy} onClick={finishGoogle}>{busy ? 'Creating your account' : 'Continue'}</Button>
        </div>
      ) : <>
      <SocialButtons role={role} agree={agree} next={next} onError={setErr} />
      <form className="au-form" onSubmit={submit}>
        <Field label="Your name" name="name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={st.email} required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={10} required hint="At least 10 characters. A few words together works well." />
        <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I agree to the <Link to="/terms" target="_blank">terms</Link> and <Link to="/privacy" target="_blank">privacy policy</Link>.</span></label>
        {err && <p className="au-err" role="alert">{err}</p>}
        <Button variant="primary" type="submit" block disabled={busy}>{busy ? 'Creating your account' : 'Create account'}</Button>
      </form>
      </>}
    </AuthLayout>
  )
}
