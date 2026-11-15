import { AnimatePresence, motion } from 'motion/react'
import { FilePlus2, LayoutGrid, List, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, IconButton } from '../components/Button'
import { Select } from '../components/Select'
import { StatusBadge } from '../components/Status'
import { fmtDate } from '../lib/dates'
import { money } from '../lib/money'
import { listItem, springSoft } from '../lib/motion'
import type { InvoiceRow, Status } from '../lib/types'
import { useApi } from '../lib/useApi'
import '../components/page.css'
import '../components/ui.css'
import './invoices.css'

const FILTERS: { id: 'all' | Status; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'draft', label: 'Drafts' }, { id: 'sent', label: 'Sent' }, { id: 'viewed', label: 'Viewed' },
  { id: 'partial', label: 'Part paid' }, { id: 'overdue', label: 'Overdue' }, { id: 'paid', label: 'Paid' }, { id: 'void', label: 'Void' },
]
const SORTS = [
  { value: 'issued-desc', label: 'Newest first' }, { value: 'issued-asc', label: 'Oldest first' }, { value: 'due-asc', label: 'Due soonest' },
  { value: 'client-asc', label: 'Client A to Z' }, { value: 'amount-desc', label: 'Highest amount' }, { value: 'balance-desc', label: 'Most owed' }, { value: 'status-asc', label: 'Status' },
]
const GROUPS = [{ value: 'none', label: 'No grouping' }, { value: 'client', label: 'By client' }, { value: 'month', label: 'By month' }, { value: 'status', label: 'By status' }]
const ORDER: Record<string, number> = { overdue: 0, partial: 1, viewed: 2, sent: 3, draft: 4, paid: 5, void: 6 }
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

/* Search, filter, sort, group and switch view. Every choice lives in the URL, so it is remembered and shareable. */
export default function Invoices() {
  const [p, setP] = useSearchParams()
  const status = (p.get('status') ?? 'all') as 'all' | Status
  const q = p.get('q') ?? ''
  const sort = p.get('sort') ?? 'issued-desc'
  const group = p.get('group') ?? 'none'
  const view = p.get('view') ?? 'list'
  const set = (k: string, v: string, def: string) => { const n = new URLSearchParams(p); if (v === def) n.delete(k); else n.set(k, v); setP(n, { replace: true }) }
  const { data, error, loading } = useApi<InvoiceRow[]>('/studio/invoices')
  const all = data ?? []

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const hay = (i: InvoiceRow) => `${i.number ?? 'draft'} ${i.client ?? ''} ${i.project ?? ''} ${i.typeName ?? ''} ${(i.total / 100).toFixed(0)}`.toLowerCase()
    const out = all.filter((i) => (status === 'all' || i.status === status) && words.every((w) => hay(i).includes(w)))
    const [k, dir] = sort.split('-'), m = dir === 'asc' ? 1 : -1
    const val = (i: InvoiceRow): string | number => (k === 'client' ? (i.client ?? '').toLowerCase() : k === 'amount' ? i.total : k === 'balance' ? i.balance : k === 'status' ? ORDER[i.status] : k === 'due' ? i.due : i.issued)
    return [...out].sort((a, b) => (val(a) > val(b) ? m : val(a) < val(b) ? -m : 0))
  }, [all, q, status, sort])

  const groups = useMemo(() => {
    if (group === 'none') return [{ key: '', rows: list }]
    const map = new Map<string, InvoiceRow[]>()
    for (const i of list) { const k = group === 'client' ? i.client ?? 'No client' : group === 'month' ? MONTH.format(new Date(i.issued)) : FILTERS.find((f) => f.id === i.status)?.label ?? i.status; map.set(k, [...(map.get(k) ?? []), i]) }
    return [...map].map(([key, rows]) => ({ key, rows }))
  }, [list, group])

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, f.id === 'all' ? all.length : all.filter((i) => i.status === f.id).length])), [all])
  const owed = list.reduce((n, i) => n + (i.status === 'draft' || i.status === 'void' ? 0 : i.balance), 0)

  return (
    <>
      <div className="ph">
        <div><h1>Invoices</h1><p>Everything you have created, sent and collected.</p></div>
        <Link to="/studio/new"><Button variant="primary"><FilePlus2 size={18} aria-hidden />New invoice</Button></Link>
      </div>

      <div className="inv-tools">
        <label className="inv-search"><Search size={17} aria-hidden /><input value={q} onChange={(e) => set('q', e.target.value, '')} placeholder="Search number, client, project or amount" aria-label="Search invoices" />{q && <IconButton label="Clear search" onClick={() => set('q', '', '')}><X size={16} /></IconButton>}</label>
        <div className="inv-sel"><Select value={sort} onChange={(v) => set('sort', v, 'issued-desc')} options={SORTS} /></div>
        <div className="inv-sel"><Select value={group} onChange={(v) => set('group', v, 'none')} options={GROUPS} /></div>
        <div className="inv-view" role="radiogroup" aria-label="View">
          <IconButton label="List view" aria-checked={view === 'list'} role="radio" className={view === 'list' ? 'on' : ''} onClick={() => set('view', 'list', 'list')}><List size={18} /></IconButton>
          <IconButton label="Grid view" aria-checked={view === 'grid'} role="radio" className={view === 'grid' ? 'on' : ''} onClick={() => set('view', 'grid', 'list')}><LayoutGrid size={18} /></IconButton>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filter by status">
        {FILTERS.filter((f) => f.id === 'all' || counts[f.id]).map((f) => <button key={f.id} className="chip tap" aria-pressed={status === f.id} onClick={() => set('status', f.id, 'all')}>{f.label} <span className="num chip-n">{counts[f.id]}</span></button>)}
      </div>
      {error && <p className="au-err" role="alert">{error}</p>}

      {!loading && list.length === 0 ? (
        <div className="empty">
          <h3>{all.length ? 'Nothing matches' : 'No invoices yet'}</h3>
          <p>{all.length ? 'Try another search or filter.' : 'Create your first invoice. Your client gets a copy by email automatically, and you can share it on WhatsApp too.'}</p>
          {all.length ? <Button onClick={() => setP({}, { replace: true })}>Clear search and filters</Button> : <Link to="/studio/new"><Button variant="primary">Create an invoice</Button></Link>}
        </div>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={`${view}-${group}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
            {groups.map((g) => (
              <section key={g.key || 'all'} className="inv-group">
                {g.key && <h2 className="inv-gh"><span>{g.key}</span><small className="num">{g.rows.length} · {money(g.rows.reduce((n, i) => n + (i.status === 'draft' || i.status === 'void' ? 0 : i.balance), 0))} owed</small></h2>}
                <div className={view === 'grid' ? 'inv-grid' : 'rows'}>
                  {g.rows.map((i, n) => (
                    <motion.div key={i.id} {...listItem(n)}>
                      <Link to={i.status === 'draft' ? `/studio/invoices/${i.id}/edit` : `/studio/invoices/${i.id}`} className={view === 'grid' ? 'inv-card tap' : 'row tap'}>
                        {view === 'grid' ? (<>
                          <span className="inv-card-top"><StatusBadge status={i.status} /><span className="num">{fmtDate(i.issued)}</span></span>
                          <b className="inv-card-client">{i.client}</b>
                          <span className="inv-card-no num">{i.number ?? `Draft · ${i.typeName ?? ''}`}</span>
                          {i.project && <span className="inv-card-proj">{i.project}</span>}
                          <span className="inv-card-amt num">{money(i.status === 'draft' ? i.total : i.balance, i.currency ?? 'INR')}<small>{i.status === 'draft' ? 'total' : i.status === 'paid' ? 'paid' : `due ${fmtDate(i.due)}`}</small></span>
                        </>) : (<>
                          <span className="row-main"><b>{i.client}</b><span className="num">{i.number ?? `Draft · ${i.typeName ?? ''}`}{i.project ? ` · ${i.project}` : ''}</span></span>
                          <span className="row-sub num">Due {fmtDate(i.due)}</span>
                          <span className="row-amt num">{money(i.status === 'draft' ? i.total : i.balance, i.currency ?? 'INR')}</span>
                          <StatusBadge status={i.status} />
                        </>)}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
            <p className="inv-total num">{list.length} {list.length === 1 ? 'invoice' : 'invoices'} · {money(owed)} still owed</p>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  )
}
