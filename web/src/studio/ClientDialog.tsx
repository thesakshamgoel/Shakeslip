import { useState } from 'react'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { errText, patch } from '../lib/api'
import { gstinValid } from '../lib/gst'
import { useToast } from '../lib/toast'
import type { Link as ClientLink } from '../lib/types'
import { ClientFields, type ClientForm } from './ClientFields'

const toForm = (l: ClientLink): ClientForm => ({ name: l.name, company: l.company, email: l.email, phone: l.phone, honorific: l.honorific ?? '', attention: l.attention ?? '', gstin: l.gstin, pan: l.pan ?? '', address: l.address, area: l.area ?? '', city: l.city, pin: l.pin ?? '', state: l.state ?? '', logo: l.logo ?? '' })

/* Everything a business keeps about a client. If the client fills in their own profile in Slip, theirs is used on invoices. */
export function ClientDialog({ link, onClose, onSaved }: { link: ClientLink | null; onClose: () => void; onSaved: () => void }) {
  return <Dialog open={!!link} onClose={onClose} title={link ? `${link.company || link.name}` : ''}>{link && <Body key={link.id} link={link} onClose={onClose} onSaved={onSaved} />}</Dialog>
}

function Body({ link, onClose, onSaved }: { link: ClientLink; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(toForm(link))
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  async function save() {
    if (busy) return
    if (v.gstin && !gstinValid(v.gstin)) { toast.bad('Fix the GSTIN first, or leave it empty.'); return }
    setBusy(true)
    try { await patch(`/studio/links/${link.id}`, { ...v, attention: v.attention || '' }); toast.ok('Client details saved. New invoices use them.'); onSaved(); onClose() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }
  return (
    <div className="dlg-form">
      {link.status === 'active' && <p className="hint">{link.name} has a Slip account. Details they add themselves take priority on invoices.</p>}
      <ClientFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
      <Button variant="primary" block disabled={busy || !v.name.trim()} onClick={save}>{busy ? 'Saving' : 'Save client'}</Button>
    </div>
  )
}
