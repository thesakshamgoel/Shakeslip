import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { Field } from '../../components/Field'
import { ImageUpload } from '../../components/ImageUpload'
import { errText, put } from '../../lib/api'
import { useSession } from '../../lib/session'
import { useToast } from '../../lib/toast'
import type { Business, Email, Phone } from '../../lib/types'
import { saveBusiness } from '../settings/save'
import type { Draft } from './state'

/* Add the missing piece right where you need it. It saves to Settings, so both always agree. */
export function QrSetup({ kind, onDone }: { kind: 'upi' | 'image'; onDone: () => void }) {
  const { me, refresh } = useSession()
  const toast = useToast()
  const [upi, setUpi] = useState('')
  const [busy, setBusy] = useState(false)
  async function saveUpi() {
    if (busy || !upi.includes('@')) { if (!upi.includes('@')) toast.bad('A UPI ID looks like name@bank.'); return }
    setBusy(true)
    try { await saveBusiness(me!, { upiId: upi.trim() }); await refresh(); toast.ok('UPI ID saved. It is in Settings too.'); onDone() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }
  return kind === 'upi'
    ? <div className="qr-setup"><Field label="Your UPI ID" value={upi} maxLength={60} placeholder="yourname@okhdfc" autoCapitalize="none" onChange={(e) => setUpi(e.target.value)} /><Button variant="primary" disabled={busy || !upi.trim()} onClick={saveUpi}>{busy ? 'Saving' : 'Save UPI ID'}</Button></div>
    : <div className="qr-setup"><ImageUpload label="Payment QR image" value="" onChange={async (v) => { try { await put('/studio/qr', { image: v }); await refresh(); toast.ok('QR saved. It is in Settings too.'); onDone() } catch (e) { toast.bad(errText(e)) } }} /></div>
}

type Pick = { e: string[]; p: string[] }
const KEY = (id: string) => `ss-contacts-${id}`
const recall = (id: string): Pick | null => { try { return JSON.parse(localStorage.getItem(KEY(id)) ?? 'null') as Pick | null } catch { return null } }

/* Which emails and numbers print on this invoice. The choice is remembered for each client. */
export function ContactPicker({ d, ex, from }: { d: Draft; ex: (p: Partial<Draft['extra']>) => void; from: Business }) {
  const { refresh } = useSession()
  const toast = useToast()
  /* with no saved list yet, the main email and number from Settings stand in so they can be unticked too */
  const emails: Email[] = from.emails?.length ? from.emails : from.email ? [{ id: 'main', label: 'Main', address: from.email, isDefault: true }] : []
  const phones: Phone[] = from.phones?.length ? from.phones : from.phone ? [{ id: 'main', label: 'Main', number: from.phone, isDefault: true }] : []
  const e = d.extra.emailIds ?? null, p = d.extra.phoneIds ?? null
  const [add, setAdd] = useState<'' | 'email' | 'phone'>('')
  const [label, setLabel] = useState(''), [val, setVal] = useState('')
  /* coming to a client you set up before: their choice comes back */
  useEffect(() => { const r = d.linkId ? recall(d.linkId) : null; if (r && e == null && p == null) ex({ emailIds: r.e, phoneIds: r.p }) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.linkId])
  const checked = (list: string[] | null | undefined, id: string, def: boolean) => (list == null ? def : list.includes(id))
  const store = (ne: string[] | null, np: string[] | null) => { ex({ emailIds: ne, phoneIds: np }); try { if (d.linkId) localStorage.setItem(KEY(d.linkId), JSON.stringify({ e: ne, p: np })) } catch { /* storage off */ } }
  const toggle = (kind: 'e' | 'p', id: string) => {
    const base = kind === 'e' ? (e ?? emails.filter((x) => x.isDefault).map((x) => x.id)) : (p ?? phones.filter((x) => x.isDefault).map((x) => x.id))
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    store(kind === 'e' ? next : e, kind === 'p' ? next : p)
  }
  async function save() {
    const id = crypto.randomUUID().slice(0, 12)
    try {
      if (add === 'email') { await put('/studio/emails', { emails: [...emails, { id, label: label.trim() || 'Other', address: val.trim(), isDefault: !emails.length }] }); store([...(e ?? emails.filter((x) => x.isDefault).map((x) => x.id)), id], p) }
      else { await put('/studio/phones', { phones: [...phones, { id, label: label.trim() || 'Other', number: val.trim(), isDefault: !phones.length }] }); store(e, [...(p ?? phones.filter((x) => x.isDefault).map((x) => x.id)), id]) }
      await refresh(); setAdd(''); setLabel(''); setVal(''); toast.ok('Saved to your Settings too.')
    } catch (x) { toast.bad(errText(x)) }
  }
  return (
    <div className="field contacts"><span>Contact details in the header</span>
      {[...emails.map((x) => ({ k: 'e' as const, id: x.id, text: `${x.label}: ${x.address}`, on: checked(e, x.id, x.isDefault) })), ...phones.map((x) => ({ k: 'p' as const, id: x.id, text: `${x.label}: ${x.number}`, on: checked(p, x.id, x.isDefault) }))].map((c) => (
        <label key={`${c.k}${c.id}`} className="check"><input type="checkbox" checked={c.on} onChange={() => toggle(c.k, c.id)} /><span>{c.text}</span></label>
      ))}
      {!emails.length && !phones.length && <small className="hint">No email or number saved yet. Add them with the plus.</small>}
      <div className="contacts-add">
        <IconButton label="Add an email" onClick={() => setAdd(add === 'email' ? '' : 'email')}><Plus size={18} /></IconButton><small>Add an email</small>
        <IconButton label="Add a phone number" onClick={() => setAdd(add === 'phone' ? '' : 'phone')}><Plus size={18} /></IconButton><small>Add a number</small>
      </div>
      {add && <div className="qr-setup"><Field label="Label" value={label} maxLength={30} placeholder={add === 'email' ? 'Accounts' : 'Office'} onChange={(x) => setLabel(x.target.value)} /><Field label={add === 'email' ? 'Email' : 'Number'} type={add === 'email' ? 'email' : 'tel'} value={val} onChange={(x) => setVal(x.target.value)} /><Button variant="primary" disabled={!val.trim()} onClick={save}>Save</Button></div>}
      <small className="hint">Your choice is remembered for this client.</small>
    </div>
  )
}
