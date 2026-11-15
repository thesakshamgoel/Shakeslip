import { motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../auth/AuthLayout'
import '../auth/auth.css'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { errText, post } from '../lib/api'
import { gstinValid } from '../lib/gst'
import { listItem } from '../lib/motion'
import { PROFESSIONS } from '../lib/professions'
import { useSession } from '../lib/session'
import './setup.css'

/* First run in two short steps: what you do, then who you are. Everything else has a sensible start. */
export default function Setup() {
  const { me, refresh } = useSession()
  const nav = useNavigate()
  const [prof, setProf] = useState<string | null>(null)
  const [gst, setGst] = useState(me?.profile?.gstin ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const gstBad = gst.length === 15 && !gstinValid(gst)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const f = new FormData(e.currentTarget)
    setBusy(true); setErr('')
    try {
      await post('/studio', { name: f.get('name'), area: f.get('area') ?? '', pin: f.get('pin') ?? '', city: f.get('city'), gstin: gst, phone: String(f.get('phone') ?? ''), address: '', email: '', profession: prof ?? 'general' })
      await refresh()
      nav('/studio', { replace: true })
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }

  if (!prof) return (
    <AuthLayout title="What do you do?" lead="We use this to suggest the right services, wording and terms. You can change it later.">
      <div className="profs">
        {PROFESSIONS.map((p, i) => (
          <motion.button key={p.id} type="button" className="prof tap" onClick={() => setProf(p.id)} {...listItem(i)} whileHover={{ y: -2 }}>
            <b>{p.label}</b><span>{p.blurb}</span>
          </motion.button>
        ))}
      </div>
    </AuthLayout>
  )

  return (
    <AuthLayout title="Set up your Studio" lead="Your business details go on every invoice. Four invoice types are ready for you to use or change.">
      <form className="au-form" onSubmit={submit}>
        <Field label="Business name" name="name" defaultValue={me?.profile?.company ?? ''} required autoFocus autoComplete="organization" />
        <Field label="Area (optional)" name="area" defaultValue={me?.profile?.area ?? ''} />
        <Field label="City" name="city" defaultValue={me?.profile?.city ?? ''} autoComplete="address-level2" />
        <Field label="PIN code (optional)" name="pin" defaultValue={me?.profile?.pin ?? ''} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
        <Field label="GSTIN (optional)" value={gst} onChange={(e) => setGst(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))} autoCapitalize="characters" hint={gstBad ? 'That GSTIN does not pass its check digit. Look for a typo.' : gst.length === 15 ? 'GSTIN checks out.' : 'Skip it if you are not GST registered. You can add it later.'} aria-invalid={gstBad} />
        <Field label="Phone (optional)" name="phone" type="tel" inputMode="tel" defaultValue={me?.user?.phone ?? ''} autoComplete="tel" />
        {err && <p className="au-err" role="alert">{err}</p>}
        <Button variant="primary" type="submit" block disabled={busy || gstBad}>{busy ? 'Setting up' : 'Open my Studio'}</Button>
        <Button type="button" variant="ghost" block onClick={() => setProf(null)}>Back</Button>
      </form>
    </AuthLayout>
  )
}
