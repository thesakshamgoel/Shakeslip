import { ContactFields } from '../components/ContactFields'
import { Lock } from 'lucide-react'
import { STATE_OPTIONS } from '../lib/gst'
import { Select } from '../components/Select'
import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { DeleteAccount } from '../components/DeleteAccount'
import { Field } from '../components/Field'
import { ImageUpload } from '../components/ImageUpload'
import { errText, put } from '../lib/api'
import { gstinValid, STATES } from '../lib/gst'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import type { Honorific } from '../lib/types'
import '../components/page.css'
import '../studio/editor.css'
import './details.css'

const TITLES: Honorific[] = ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s.']

/* The client's own details and logo. Connected businesses use these on every invoice they send. */
export default function Details() {
  const { me, refresh } = useSession()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const p = me!.profile!
  const [phones, setPhones] = useState(p.phones ?? [])
  const [emails, setEmails] = useState(p.emails ?? [])
  const [title, setTitle] = useState<Honorific>(p.honorific ?? '')
  const [gst, setGst] = useState(p.gstin)
  const gBad = gst.length > 0 && !gstinValid(gst)

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy || gBad) return
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true)
    try {
      await put('/account/me', { phones, emails, name: v('name'), phone: v('phone'), company: v('company'), gstin: gst, address: v('address'), area: v('area'), city: v('city'), pin: v('pin'), state: v('state'), pan: v('pan').toUpperCase(), honorific: title })
      await refresh(); toast.ok('Saved. Businesses you are connected to use these on future invoices.')
    } catch (x) { toast.bad(errText(x)) } finally { setBusy(false) }
  }
  async function saveLogo(image: string) {
    try { await put('/account/logo', { image }); await refresh(); toast.ok(image ? 'Logo saved. It appears on invoices sent to you.' : 'Logo removed.') } catch (x) { toast.bad(errText(x)) }
  }

  return (
    <>
      <div className="ph"><div><h1>My details</h1><p>Add them once. Every business you work with uses the same correct details on your invoices.</p></div></div>
      <div className="dt">
        <form className="dt-form" onSubmit={save}>
          <ImageUpload label="Your business logo (optional)" value={p.logo ?? ''} onChange={saveLogo} hint="Shows in the Bill to block on invoices sent to you." />
          <div className="field"><span>Title</span><div className="chips2">{TITLES.map((t) => <Chip key={t || 'none'} icon={false} on={title === t} onClick={() => setTitle(t)}>{t || 'None'}</Chip>)}</div></div>
          <div className="grid2">
            <Field label="Full name" name="name" defaultValue={me!.user!.name} autoComplete="name" required />
            <Field label="Company (optional)" name="company" defaultValue={p.company} autoComplete="organization" />
            <Field label="WhatsApp number" name="phone" type="tel" defaultValue={me!.user!.phone} autoComplete="tel" inputMode="tel" hint="Used only to match invites and share invoices." />
            <Field label="GSTIN (optional)" value={gst} maxLength={15} onChange={(e) => setGst(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))} aria-invalid={gBad} hint={gBad ? 'This does not pass the GSTIN check digit.' : gst.length === 15 ? `Checks out: ${STATES[gst.slice(0, 2)]}` : undefined} />
            <Field label="PAN (optional)" name="pan" defaultValue={p.pan} maxLength={10} autoCapitalize="characters" />
            <Field label="Area" name="area" defaultValue={p.area} />
            <Field label="City" name="city" defaultValue={p.city} autoComplete="address-level2" />
            <Field label="PIN code" name="pin" defaultValue={p.pin} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
          </div>
          <Field label="Billing address" name="address" defaultValue={p.address} autoComplete="street-address" />
          <Select label="State" name="state" value={p.state ?? ''} options={STATE_OPTIONS} disabled={gst.length === 15 && !gBad} hint={gst.length === 15 && !gBad ? 'Taken from your GSTIN.' : 'Decides whether you are charged IGST or CGST and SGST.'} />
          <ContactFields phones={phones} emails={emails} onChange={(v) => { if (v.phones) setPhones(v.phones); if (v.emails) setEmails(v.emails) }} />
          <p className="hint">Signed in as {me!.user!.email}</p>
          <Button variant="primary" type="submit" disabled={busy || gBad}>{busy ? 'Saving' : 'Save details'}</Button>
          <DeleteAccount />
        </form>
        <aside className="dt-side">
          <h2><Lock size={16} aria-hidden />Who can see this</h2>
          <p>Only the businesses you have connected with. Nobody else can open your invoices or details, and we never use them to train AI models.</p>
        </aside>
      </div>
    </>
  )
}
