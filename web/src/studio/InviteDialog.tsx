import { Check, Mail, MessageCircle } from 'lucide-react'
import { Select } from '../components/Select'
import { useState } from 'react'
import { Button } from '../components/Button'
import { CopyButton } from '../components/CopyButton'
import { Dialog } from '../components/Dialog'
import { QR } from '../components/QR'
import { errText, patch, post } from '../lib/api'
import { gstinValid } from '../lib/gst'
import { useToast } from '../lib/toast'
import type { Group } from '../lib/types'
import { whatsappUrl } from '../lib/whatsapp'
import { ClientFields, emptyClient, type ClientForm } from './ClientFields'
import './clients.css'

type Result = { inviteUrl: string; message: string; emailed: boolean; phone: string; name: string }

/* Three ways to link a client: email (automatic), WhatsApp (one tap), or a link or QR in person. */
export function InviteDialog({ open, onClose, groups, onDone }: { open: boolean; onClose: () => void; groups: Group[]; onDone: (id?: string) => void }) {
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [v, setV] = useState<ClientForm>(emptyClient())
  const [group, setGroup] = useState<string | null>(null)
  const toast = useToast()
  const g = group ?? groups[0]?.id ?? ''

  function close() { setRes(null); setErr(''); setV(emptyClient()); setGroup(null); onClose() }
  async function submit() {
    if (busy) return
    if (v.gstin && !gstinValid(v.gstin)) { setErr('Fix the GSTIN first, or leave it empty.'); return }
    setBusy(true); setErr('')
    try {
      const { logo, ...rest } = v
      const r = await post<Omit<Result, 'phone' | 'name'> & { id: string }>('/studio/links/invite', { ...rest, groupId: g || null })
      if (logo) await patch(`/studio/links/${r.id}`, { logo })
      setRes({ ...r, phone: v.phone, name: v.name })
      onDone(r.id)
    } catch (e) { setErr(errText(e)); toast.bad(errText(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={close} title={res ? `Invite ready for ${res.name}` : 'Add a client'}>
      {!res ? (
        <form className="dlg-form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <p style={{ color: 'var(--text-2)' }}>They get a secure link to connect. After that, every invoice reaches them automatically and you both get updates.</p>
          <ClientFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
          <Select label="Group" value={g} onChange={setGroup} options={[...groups.map((x) => ({ value: x.id, label: x.name })), { value: '', label: 'No group' }]} />
          {err && <p className="au-err" role="alert">{err}</p>}
          <Button variant="primary" type="submit" block disabled={busy || !v.name.trim() || !(v.email || v.phone)}>{busy ? 'Creating invite' : 'Create invite'}</Button>
          {!(v.email || v.phone) && <p className="hint">Add an email or a WhatsApp number so we can reach them.</p>}
        </form>
      ) : (
        <div className="dlg-form">
          {res.emailed && <p className="au-ok" style={{ display: 'flex', gap: 8 }}><Mail size={18} aria-hidden />We emailed the invite. You can also share it another way:</p>}
          {!res.emailed && <p style={{ color: 'var(--text-2)' }}>Share the invite another way:</p>}
          <div className="share">
            {res.phone && <a href={whatsappUrl(res.phone, res.message)} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><MessageCircle size={18} aria-hidden />Send on WhatsApp</a>}
            <CopyButton text={res.inviteUrl} />
          </div>
          <div className="share-qr"><QR value={res.inviteUrl} size={148} /><p className="hint">Or let them scan this with their phone camera. The link works once and expires in 24 hours.</p></div>
          <Button variant="primary" block onClick={close}><Check size={18} aria-hidden />Done</Button>
        </div>
      )}
    </Dialog>
  )
}
