import { WhatsAppIcon } from '../components/WhatsAppIcon'
import { Check, Mail, MessageSquareText, Send, Share2 } from 'lucide-react'
import { Select } from '../components/Select'
import { useState } from 'react'
import { Button } from '../components/Button'
import { CopyButton } from '../components/CopyButton'
import { Dialog } from '../components/Dialog'
import { QR } from '../components/QR'
import { errText, patch, post } from '../lib/api'
import { useSession } from '../lib/session'
import { gstinValid } from '../lib/gst'
import { useToast } from '../lib/toast'
import type { Group } from '../lib/types'
import { whatsappUrl } from '../lib/whatsapp'
import { ClientFields, emptyClient, type ClientForm } from './ClientFields'
import './clients.css'

type Result = { inviteUrl: string; message: string; emailed: boolean; phone: string; name: string; email: string }

/* Three ways to link a client: email (automatic), WhatsApp (one tap), or a link or QR in person. */
export function InviteDialog({ open, onClose, groups, onDone }: { open: boolean; onClose: () => void; groups: Group[]; onDone: (id?: string) => void }) {
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [v, setV] = useState<ClientForm>(emptyClient())
  const [group, setGroup] = useState<string | null>(null)
  const toast = useToast()
  const { me } = useSession()
  const biz = me?.business
  /* your connect link works for anyone: send it first, or fill in their details below for a personal invite */
  const connectUrl = biz ? `${location.origin}/c/${biz.slug}` : ''
  const quick = biz ? `${biz.name} would like to send your invoices through Shakeslip. Connect here: ${connectUrl}` : ''
  const g = group ?? groups[0]?.id ?? ''

  function close() { setRes(null); setErr(''); setV(emptyClient()); setGroup(null); onClose() }
  async function submit() {
    if (busy) return
    if (v.gstin && !gstinValid(v.gstin)) { setErr('Fix the GSTIN first, or leave it empty.'); return }
    setBusy(true); setErr('')
    try {
      const { logo, ...rest } = v
      const r = await post<Omit<Result, 'phone' | 'name' | 'email'> & { id: string }>('/studio/links/invite', { ...rest, groupId: g || null })
      if (logo) await patch(`/studio/links/${r.id}`, { logo })
      setRes({ ...r, phone: v.phone, name: v.name, email: v.email })
      onDone(r.id)
    } catch (e) { setErr(errText(e)); toast.bad(errText(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={close} title={res ? `Invite ready for ${res.name}` : 'Add a client'}>
      {!res ? (
        <form className="dlg-form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          {connectUrl && (
            <div className="quick" role="group" aria-label="Send your link">
              <b>Send your link</b>
              <small className="hint">Anyone can open it, create a free Slip account and ask to connect. No details needed.</small>
              <div className="share">
                {typeof navigator !== 'undefined' && 'share' in navigator && <Button variant="primary" onClick={() => { void navigator.share({ title: 'Connect on Shakeslip', text: quick }).catch(() => {}) }}><Share2 size={18} aria-hidden />Send link</Button>}
                <a href={`https://wa.me/?text=${encodeURIComponent(quick)}`} target="_blank" rel="noopener noreferrer" className="btn"><WhatsAppIcon size={18} aria-hidden />WhatsApp</a>
                <a href={`sms:?&body=${encodeURIComponent(quick)}`} className="btn"><MessageSquareText size={18} aria-hidden />SMS</a>
                <a href={`mailto:?subject=${encodeURIComponent(`${biz?.name} on Shakeslip`)}&body=${encodeURIComponent(quick)}`} className="btn"><Mail size={18} aria-hidden />Email</a>
                <CopyButton text={connectUrl} />
              </div>
            </div>
          )}
          <p className="quick-or" aria-hidden><span>or add their details for a personal invite</span></p>
          <p style={{ color: 'var(--text-2)' }}>They get a secure link to connect. After that, every invoice reaches them automatically and you both get updates.</p>
          <ClientFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
          <Select label="Group" value={g} onChange={setGroup} options={[...groups.map((x) => ({ value: x.id, label: x.name })), { value: '', label: 'No group' }]} />
          {err && <p className="au-err" role="alert">{err}</p>}
          <Button variant="primary" type="submit" block disabled={busy || !v.name.trim() || !(v.email || v.phone)}><Send size={18} aria-hidden />{busy ? 'Adding' : 'Add and send link'}</Button>
          {!(v.email || v.phone) && <p className="hint">Add an email or a WhatsApp number so we can reach them.</p>}
        </form>
      ) : (
        <div className="dlg-form">
          {res.emailed && <p className="au-ok" style={{ display: 'flex', gap: 8 }}><Mail size={18} aria-hidden />We emailed the invite. You can also share it another way:</p>}
          {!res.emailed && <p style={{ color: 'var(--text-2)' }}>Share the invite another way:</p>}
          <div className="share">
            {typeof navigator !== 'undefined' && 'share' in navigator && <Button variant="primary" onClick={() => { void navigator.share({ title: 'Shakeslip invite', text: res.message }).catch(() => {}) }}><Share2 size={18} aria-hidden />Send link</Button>}
            {res.phone && <a href={`sms:${res.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(res.message)}`} className="btn"><MessageSquareText size={18} aria-hidden />SMS</a>}
            {res.email && <a href={`mailto:${res.email}?subject=${encodeURIComponent('Your Shakeslip invite')}&body=${encodeURIComponent(res.message)}`} className="btn"><Mail size={18} aria-hidden />Email</a>}
            {res.phone && <a href={whatsappUrl(res.phone, res.message)} target="_blank" rel="noopener noreferrer" className="btn"><WhatsAppIcon size={18} aria-hidden />Send on WhatsApp</a>}
            <CopyButton text={res.inviteUrl} />
          </div>
          <div className="share-qr"><QR value={res.inviteUrl} size={148} /><p className="hint">Or let them scan this with their phone camera. The link works once and expires in 24 hours.</p></div>
          <Button variant="primary" block onClick={close}><Check size={18} aria-hidden />Done</Button>
        </div>
      )}
    </Dialog>
  )
}
