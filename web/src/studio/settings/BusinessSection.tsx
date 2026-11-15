import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { Select } from '../../components/Select'
import { errText } from '../../lib/api'
import { gstinValid, STATE_OPTIONS, STATES } from '../../lib/gst'
import { PROFESSIONS } from '../../lib/professions'
import { useSession } from '../../lib/session'
import { useToast } from '../../lib/toast'
import { saveBusiness } from './save'

export function BusinessSection() {
  const { me, refresh } = useSession()
  const b = me!.business!
  const toast = useToast()
  const [gst, setGst] = useState(b.gstin)
  const [busy, setBusy] = useState(false)
  const bad = gst.length > 0 && !gstinValid(gst)
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy || bad) return
    const f = new FormData(e.currentTarget), v = (k: string) => String(f.get(k) ?? '').trim()
    setBusy(true)
    try { await saveBusiness(me!, { name: v('name'), gstin: gst, pan: v('pan').toUpperCase(), address: v('address'), area: v('area'), pin: v('pin'), city: v('city'), state: v('state'), email: v('email'), phone: v('phone'), website: v('website'), profession: v('profession') }); await refresh(); toast.ok('Business details saved.') } catch (x) { toast.bad(errText(x)) } finally { setBusy(false) }
  }
  return (
    <form className="set-card" onSubmit={save}>
      <header><h2>Business</h2><p>Your name, tax details and contact. They print on every new invoice.</p></header>
      <div className="grid2">
        <Field label="Business name" name="name" defaultValue={b.name} required maxLength={80} />
        <Select label="What you do" name="profession" value={b.profession} options={PROFESSIONS.map((p) => ({ value: p.id, label: p.label, hint: p.blurb }))} />
      </div>
      <div className="grid2">
        <Field label="GSTIN" value={gst} onChange={(e) => setGst(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))} aria-invalid={bad} hint={bad ? 'This does not pass the GSTIN check digit.' : gst ? `Registered in ${STATES[gst.slice(0, 2)] ?? 'an unknown state'}` : 'Leave empty if you are not GST registered.'} />
        <Field label="PAN" name="pan" defaultValue={b.pan} maxLength={10} autoCapitalize="characters" />
      </div>
      <Field label="Address" name="address" defaultValue={b.address} autoComplete="street-address" />
      <div className="grid2">
        <Field label="Area" name="area" defaultValue={b.area ?? ''} />
        <Field label="City" name="city" defaultValue={b.city} autoComplete="address-level2" />
        <Field label="PIN code" name="pin" defaultValue={b.pin ?? ''} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
        <Select label="State" name="state" value={b.state ?? ''} options={STATE_OPTIONS} disabled={!!gst} hint={gst ? 'Taken from your GSTIN.' : 'Decides IGST or CGST and SGST.'} />
        <Field label="Email on invoices" name="email" type="email" inputMode="email" defaultValue={b.email} />
        <Field label="Main phone" name="phone" type="tel" inputMode="tel" defaultValue={b.phone} />
      </div>
      <Field label="Website (optional)" name="website" defaultValue={b.website} />
      <footer><Button variant="primary" type="submit" disabled={busy || bad}>{busy ? 'Saving' : 'Save business'}</Button></footer>
    </form>
  )
}
