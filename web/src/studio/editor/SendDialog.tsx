import { FileDown, Inbox } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import type { Link } from '../../lib/types'
import './senddialog.css'

export type SendOpts = { delivery: 'shakeslip' | 'pdf'; needsAccept: boolean }
const KEY = 'ss-send-opts'
const saved = (): SendOpts => { try { return { delivery: 'shakeslip', needsAccept: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { delivery: 'shakeslip', needsAccept: false } } }

/* How this invoice reaches the client, and whether they need to sign. Asked every time, remembered for next. */
export function SendDialog({ open, onClose, onSend, busy, label, client }: { open: boolean; onClose: () => void; onSend: (o: SendOpts) => void; busy: boolean; label: string; client?: Link }) {
  const [o, setO] = useState<SendOpts>(saved)
  const set = (p: Partial<SendOpts>) => setO((x) => { const n = { ...x, ...p }; if (n.delivery === 'pdf') n.needsAccept = false; try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* storage may be off */ } return n })
  const who = client?.company || client?.name || 'your client'
  return (
    <Dialog open={open} onClose={onClose} title="How do you want to send it?">
      <div className="sd" role="radiogroup" aria-label="How to send">
        <button type="button" role="radio" aria-checked={o.delivery === 'shakeslip'} className="sd-opt tap" onClick={() => set({ delivery: 'shakeslip' })}>
          <Inbox size={20} aria-hidden /><span><b>Through Shakeslip</b><small>{who} gets it in their Slip inbox{client?.email ? ' and by email' : ''}. They can see what is due, mark a payment as made and ask for changes. You are notified when they open it.</small></span>
        </button>
        <button type="button" role="radio" aria-checked={o.delivery === 'pdf'} className="sd-opt tap" onClick={() => set({ delivery: 'pdf' })}>
          <FileDown size={20} aria-hidden /><span><b>Just the PDF</b><small>The invoice gets its number and is locked, but nothing is sent. Download the PDF and send it yourself by WhatsApp, email or print. Clients cannot sign this way.</small></span>
        </button>
      </div>
      <label className={`switch-row ${o.delivery === 'pdf' ? 'sd-off' : ''}`}>
        <span><b>Ask {who} to accept and sign</b><small>{o.delivery === 'pdf' ? 'Only with Through Shakeslip. A PDF cannot be signed in the app.' : o.needsAccept ? 'They sign in their Slip dashboard. You and they are both notified, and the signature prints on the invoice.' : 'Off: they just receive it. Turn it on for quotes, contracts or projects that need a yes.'}</small></span>
        <input type="checkbox" role="switch" checked={o.needsAccept} aria-disabled={o.delivery === 'pdf'} onChange={(e) => { if (o.delivery !== 'pdf') set({ needsAccept: e.target.checked }) }} />
      </label>
      <Button variant="primary" block disabled={busy} onClick={() => onSend(o)}>{busy ? 'Sending' : o.delivery === 'pdf' ? `Issue and get PDF, ${label}` : `Send ${label}`}</Button>
    </Dialog>
  )
}
