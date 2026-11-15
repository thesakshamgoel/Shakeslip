import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { errText, post } from '../lib/api'
import { AuthLayout } from './AuthLayout'

export function Forgot() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    try { await post('/account/forgot', { email: new FormData(e.currentTarget).get('email') }); setSent(true) } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <AuthLayout title="Reset your password" lead="Enter your email and we will send you a link." foot={<Link to="/login">Back to sign in</Link>}>
      {sent ? <p className="au-ok" role="status">If an account exists for that email, a reset link is on its way. It works for one hour.{import.meta.env.DEV && <> While testing locally the link is printed in the server terminal.</>}</p> : (
        <form className="au-form" onSubmit={submit}>
          <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" required autoFocus />
          {err && <p className="au-err" role="alert">{err}</p>}
          <Button variant="primary" type="submit" block disabled={busy}>{busy ? 'Sending' : 'Send reset link'}</Button>
        </form>
      )}
    </AuthLayout>
  )
}

export function Reset() {
  const { token } = useParams()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    try { await post('/account/reset', { token, password: new FormData(e.currentTarget).get('password') }); nav('/login', { replace: true }) } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <AuthLayout title="Choose a new password" lead="You will be signed out everywhere else.">
      <form className="au-form" onSubmit={submit}>
        <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus hint="At least 10 characters." />
        {err && <p className="au-err" role="alert">{err}</p>}
        <Button variant="primary" type="submit" block disabled={busy}>{busy ? 'Saving' : 'Save new password'}</Button>
      </form>
    </AuthLayout>
  )
}
