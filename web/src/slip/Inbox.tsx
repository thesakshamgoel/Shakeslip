import { Link, useSearchParams } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { Button, IconButton } from '../components/Button'
import { StatusBadge } from '../components/Status'
import { fmtDate } from '../lib/dates'
import { inr, money } from '../lib/money'
import { GreetHeading } from '../components/Welcome'
import { useSession } from '../lib/session'
import type { InvoiceRow } from '../lib/types'
import { useApi } from '../lib/useApi'
import '../components/page.css'
import '../components/ui.css'
import '../studio/invoices.css'

const F = [{ id: 'pay', label: 'To pay' }, { id: 'paid', label: 'Paid' }, { id: 'all', label: 'All' }] as const

export default function Inbox() {
  const { me } = useSession()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') ?? 'grid'
  const set = (key: string, value: string, fallback: string) => { const next = new URLSearchParams(params); if (value === fallback) next.delete(key); else next.set(key, value); setParams(next, { replace: true }) }
  const f = (params.get('show') ?? 'pay') as (typeof F)[number]['id']
  const { data, loading } = useApi<InvoiceRow[]>('/slip/invoices')
  const all = data ?? []
  const list = all.filter((r) => (f === 'all' ? true : f === 'paid' ? r.status === 'paid' || r.status === 'void' : r.status !== 'paid' && r.status !== 'void'))
  const owed = all.filter((r) => (r.currency ?? 'INR') === 'INR').reduce((n, r) => n + r.balance, 0)
  const open = all.filter((r) => r.status !== 'paid' && r.status !== 'void').length
  return (
    <>
      <div className="ph"><div><GreetHeading name={me?.user?.name.split(' ')[0] ?? ''} /><p>Every invoice sent to you, in one place.</p></div></div>
      <section className="stats" aria-label="Summary" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="stat"><small>You owe</small><b className="num">{inr(owed)}</b><span>{open} {open === 1 ? 'invoice' : 'invoices'} open</span></div>
        <div className="stat"><small>Businesses</small><b className="num">{new Set(all.map((r) => r.from)).size}</b><span>Send you invoices</span></div>
      </section>
      <div className="chips" role="group" aria-label="Filter">
        {F.map((x) => <button key={x.id} className="chip tap" aria-pressed={f === x.id} onClick={() => set('show', x.id, 'pay')}>{x.label}</button>)}
      </div>
      <div className="inv-view" role="radiogroup" aria-label="View"><IconButton label="Grid view" role="radio" aria-checked={view === 'grid'} onClick={() => set('view', 'grid', 'grid')}><LayoutGrid size={18} /></IconButton><IconButton label="List view" role="radio" aria-checked={view === 'list'} onClick={() => set('view', 'list', 'grid')}><List size={18} /></IconButton></div>
      {!loading && list.length === 0 ? (
        <div className="empty">
          <h3>{all.length ? 'Nothing here' : 'No invoices yet'}</h3>
          <p>{all.length ? 'Try another filter.' : 'Connect with a business so their invoices arrive here. Ask them for an invite link, or enter their connect code.'}</p>
          {!all.length && <Link to="/slip/connections"><Button variant="primary">Connect with a business</Button></Link>}
        </div>
      ) : (
        <div className={view === 'grid' ? 'inv-grid' : 'rows'}>
          {list.map((r) => (
            <Link key={r.id} to={`/slip/invoices/${r.id}`} className={view === 'grid' ? 'inv-card tap' : 'row tap'}>
              <span className="row-main"><b className="trunc">{r.from}</b><span className="num">{r.number}</span></span>
              <span className="row-sub num">Due {fmtDate(r.due)}</span>
              <span className="row-amt num">{money(r.balance, r.currency ?? 'INR')}</span>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
