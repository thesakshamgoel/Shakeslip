import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { SlipIcon, StudioIcon } from '../brand/icons'
import { errText, post } from '../lib/api'
import { useSession } from '../lib/session'
import { markLogin } from '../lib/welcome'
import { AuthLayout } from './AuthLayout'
import { SocialButtons } from './Social'
import { safeNext } from './Guard'

export default function Signup() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const nav = useNavigate()
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
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }

  return (
    <AuthLayout title="Create your account" lead="It takes under a minute. You can use both Studio and Slip with one login." foot={<>Already have an account? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</Link></>}>
      <div className="roles" role="group" aria-label="What brings you here">
        <button type="button" className="role role-i tap" aria-pressed={role === 'studio'} onClick={() => setRole('studio')}><StudioIcon size={36} /><span><b>I send invoices</b><span>Studio, for my business or freelance work</span></span></button>
        <button type="button" className="role role-i tap" aria-pressed={role === 'slip'} onClick={() => setRole('slip')}><SlipIcon size={36} /><span><b>I receive invoices</b><span>Slip, my inbox for bills</span></span></button>
      </div>
      <SocialButtons role={role} agree={agree} next={next} onError={setErr} />
      <form className="au-form" onSubmit={submit}>
        <Field label="Your name" name="name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={10} required hint="At least 10 characters. A few words together works well." />
        <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I agree to the <Link to="/terms" target="_blank">terms</Link> and <Link to="/privacy" target="_blank">privacy policy</Link>.</span></label>
        {err && <p className="au-err" role="alert">{err}</p>}
        <Button variant="primary" type="submit" block disabled={busy}>{busy ? 'Creating your account' : 'Create account'}</Button>
      </form>
    </AuthLayout>
  )
}
