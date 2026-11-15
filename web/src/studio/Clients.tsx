import { Check, FilePlus2, FolderPlus, Pencil, QrCode, RefreshCw, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { CopyButton } from '../components/CopyButton'
import { Dialog } from '../components/Dialog'
import { QR } from '../components/QR'
import { del, errText, post } from '../lib/api'
import { useSession } from '../lib/session'
import { useToast } from '../lib/toast'
import type { Group, InvoiceType, Link as ClientLink } from '../lib/types'
import { useApi } from '../lib/useApi'
import { getInvoiceTheme } from '../themes/invoice'
import { ClientDialog } from './ClientDialog'
import { GroupDialog } from './GroupDialog'
import { codeLeft } from '../lib/codeTime'
import { InviteDialog } from './InviteDialog'
import { GroupSuggestions } from './GroupSuggestions'
import { stateOf } from '../lib/gst'
import '../components/page.css'
import './clients.css'

const remindText = (g: Group) => {
  const r = g.reminders
  const parts = [...r.before.map((d) => `${d}d before`), r.onDue && 'on due date', r.afterEvery && `every ${r.afterEvery}d after`].filter(Boolean)
  return parts.length ? parts.join(', ') : 'No reminders'
}

export default function Clients() {
  const { me } = useSession()
  const groups = useApi<Group[]>('/studio/groups')
  const links = useApi<ClientLink[]>('/studio/links')
  const types = useApi<InvoiceType[]>('/studio/types')
  const toast = useToast()
  const [invite, setInvite] = useState(false)
  const [share, setShare] = useState(false)
  const [edit, setEdit] = useState<ClientLink | null>(null)
  const [grp, setGrp] = useState<{ open: boolean; group: Group | null }>({ open: false, group: null })
  const reload = () => { void groups.reload(); void links.reload() }
  const connectUrl = `${location.origin}/c/${me?.business?.slug}`
  const list = links.data ?? []
  const pending = list.filter((l) => l.status === 'pending')

  async function act(fn: () => Promise<unknown>, ok: string) { try { await fn(); toast.ok(ok); reload() } catch (e) { toast.bad(errText(e)) } }

  return (
    <>
      <div className="ph">
        <div><h1>Clients</h1><p>The people you invoice. Group them and each group runs on its own look, terms and reminders.</p></div>
        <div className="ph-actions">
          <Button onClick={() => setShare(true)}><QrCode size={18} aria-hidden />Connect link</Button>
          <Button onClick={() => setGrp({ open: true, group: null })}><FolderPlus size={18} aria-hidden />New group</Button>
          <Button variant="primary" onClick={() => setInvite(true)}><UserPlus size={18} aria-hidden />Add a client</Button>
        </div>
      </div>

      {!!pending.length && (
        <section className="sec" aria-label="Requests">
          <div className="sec-h"><h2>Waiting for your approval</h2></div>
          <div className="rows">
            {pending.map((l) => (
              <div className="crow" key={l.id}>
                <span className="avatar" aria-hidden>{l.name.slice(0, 1)}</span>
                <span className="row-main"><b className="trunc">{l.name}</b><span className="trunc">{l.email} asked to connect</span></span>
                <span className="crow-act"><Button variant="primary" onClick={() => act(() => post(`/studio/links/${l.id}/approve`), `${l.name} is connected.`)}><Check size={18} aria-hidden />Approve</Button><Button onClick={() => act(() => post(`/studio/links/${l.id}/decline`), 'Request declined.')}><X size={18} aria-hidden />Decline</Button></span>
              </div>
            ))}
          </div>
        </section>
      )}

      {list.length > 1 && groups.data && <GroupSuggestions links={list} groups={groups.data} bizState={stateOf(me?.business?.gstin, me?.business?.state)} onDone={reload} />}

      {!links.loading && !list.length && (
        <div className="empty"><h3>No clients yet</h3><p>Add a client by email or WhatsApp, or share your connect link or QR so they can find you. You will need a client before you can create an invoice.</p><Button variant="primary" onClick={() => setInvite(true)}><UserPlus size={18} aria-hidden />Add your first client</Button></div>
      )}

      {[...(groups.data ?? []), { id: '', name: 'No group', theme: 'onyx', reminders: { before: [], onDue: false, afterEvery: null }, clients: 0, typeId: null, dueDays: 0 } as Group].map((g) => {
        const mine = list.filter((l) => l.status !== 'pending' && (l.groupId ?? '') === g.id)
        if (!g.id && !mine.length) return null
        return (
          <section className="grp" key={g.id || 'none'} aria-label={g.name}>
            <header className="grp-h">
              <div><h2>{g.name}</h2><span className="grp-count">{mine.length} {mine.length === 1 ? 'client' : 'clients'}</span></div>
              {g.id && <div className="grp-side"><ul className="grp-rules"><li>{g.theme ? `${getInvoiceTheme(g.theme).name} look` : 'Your default look'}</li><li>Due in {g.dueDays} days</li><li>{remindText(g)}</li></ul><IconButton label={`Edit ${g.name}`} onClick={() => setGrp({ open: true, group: g })}><Pencil size={18} /></IconButton></div>}
            </header>
            <div className="rows">
              {mine.map((l) => (
                <div className="crow" key={l.id}>
                  {l.logo ? <img src={l.logo} alt="" className="client-logo" /> : <span className="avatar" aria-hidden>{(l.company || l.name).slice(0, 1)}</span>}
                  <span className="row-main"><b className="trunc">{l.company || l.name}</b><span className="trunc">{l.company ? `${l.name} · ` : ''}{l.email || l.phone}</span></span>
                  <span className={`badge ${l.status === 'active' ? 'badge-ok' : 'badge-warn'}`}><span className="badge-dot" aria-hidden />{l.status === 'active' ? 'Connected' : 'Invite sent'}</span>
                  <span className="crow-act">
                    <IconButton label={`Edit ${l.company || l.name}`} onClick={() => setEdit(l)}><Pencil size={17} /></IconButton>
                    {l.status === 'invited' && <Button onClick={() => act(() => post(`/studio/links/${l.id}/resend`), 'Invite sent again.')}><RefreshCw size={18} aria-hidden />Resend</Button>}
                    <Link to={`/studio/new?client=${l.id}`}><Button><FilePlus2 size={18} aria-hidden />Invoice</Button></Link>
                    <IconButton label={`Remove ${l.name}`} onClick={() => { if (window.confirm(`Remove ${l.name}? Their past invoices stay in your records.`)) void act(() => del(`/studio/links/${l.id}`), 'Client removed.') }}><X size={18} /></IconButton>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <ClientDialog link={edit} onClose={() => setEdit(null)} onSaved={reload} />
      <InviteDialog open={invite} onClose={() => setInvite(false)} groups={groups.data ?? []} onDone={reload} />
      <GroupDialog key={grp.group?.id ?? 'new'} open={grp.open} onClose={() => setGrp({ open: false, group: null })} group={grp.group} types={types.data ?? []} onDone={reload} />
      <Dialog open={share} onClose={() => setShare(false)} title="Your connect link">
        <p style={{ color: 'var(--text-2)' }}>Put this on your website, business card or invoices. Clients scan it or open it, create a free account, and are connected straight away (you can switch this to approve each request in Settings). {me?.business?.autoApprove ? 'They are connected straight away.' : 'You approve each request.'}</p>
        <div className="share-qr"><QR value={connectUrl} size={168} /><div className="dlg-form"><code className="code">{me?.business?.slug}</code><small className="hint">{codeLeft(me?.business?.slugAt)}</small><CopyButton text={connectUrl} /><p className="hint">Clients can also type the code on their Connections page.</p></div></div>
      </Dialog>
    </>
  )
}
