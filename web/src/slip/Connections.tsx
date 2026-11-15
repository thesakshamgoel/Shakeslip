import { Link2, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { Field } from '../components/Field'
import { del, errText, post } from '../lib/api'
import { useToast } from '../lib/toast'
import { useApi } from '../lib/useApi'
import '../components/page.css'
import '../studio/clients.css'

type Conn = { id: string; status: 'active' | 'pending'; name: string; city: string }

export default function Connections() {
  const { data, reload } = useApi<{ connections: Conn[] }>('/slip/connections')
  const toast = useToast()
  const loc = useLocation()
  const joined = (loc.state as { connected?: string; pending?: boolean } | null) ?? {}
  const [busy, setBusy] = useState(false)
  const list = data?.connections ?? []

  async function connect(f: FormData, form: HTMLFormElement) {
    if (busy) return
    setBusy(true)
    try { const r = await post<{ business: string; status: string }>('/slip/connections/connect', { code: f.get('code') }); toast.ok(r.status === 'pending' ? `Request sent to ${r.business}. They will approve it.` : `Connected with ${r.business}.`); form.reset(); await reload() } catch (e) { toast.bad(errText(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="ph"><div><h1>Connections</h1><p>The businesses that send you invoices. Only they can send you invoices, and only you can see them.</p></div></div>
      {joined.connected && <p className="au-ok" role="status" style={{ marginBottom: 'var(--s-4)' }}>{joined.pending ? `Request sent to ${joined.connected}. You will be told when they approve.` : `You are connected with ${joined.connected}. Their invoices will appear in your inbox.`}</p>}
      <section className="sec">
        <div className="sec-h"><h2>Connect with a business</h2></div>
        <form className="dlg-form" style={{ maxWidth: 460 }} onSubmit={(e) => { e.preventDefault(); void connect(new FormData(e.currentTarget), e.currentTarget) }}>
          <Field label="Business code or link" name="code" placeholder="Paste their connect link or code" required autoComplete="off" hint="Got an invite email instead? Just open the link in it." />
          <Button variant="primary" type="submit" disabled={busy}><Link2 size={18} aria-hidden />{busy ? 'Connecting' : 'Connect'}</Button>
        </form>
      </section>
      <section className="sec">
        <div className="sec-h"><h2>Your businesses</h2></div>
        {!list.length ? <div className="empty"><h3>Not connected yet</h3><p>When a business invites you, or you enter their code above, they show up here.</p></div> : (
          <div className="rows">{list.map((c) => (
            <div className="crow" key={c.id} style={{ gridTemplateColumns: '32px minmax(0,1fr) auto var(--tap)' }}>
              <span className="avatar" aria-hidden>{c.name.slice(0, 1)}</span>
              <span className="row-main"><b className="trunc">{c.name}</b><span>{c.city}</span></span>
              <span className={`badge ${c.status === 'active' ? 'badge-ok' : 'badge-warn'}`}><span className="badge-dot" aria-hidden />{c.status === 'active' ? 'Connected' : 'Waiting for approval'}</span>
              <IconButton label={`Disconnect from ${c.name}`} onClick={() => { if (window.confirm(`Disconnect from ${c.name}? You will stop receiving new invoices from them.`)) void del(`/slip/connections/${c.id}`).then(reload) }}><X size={18} /></IconButton>
            </div>))}</div>
        )}
      </section>
    </>
  )
}
