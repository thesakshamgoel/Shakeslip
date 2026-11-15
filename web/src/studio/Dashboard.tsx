import { motion } from 'motion/react'
import { Check, FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Feed } from '../components/Feed'
import { Insights } from './Insights'
import { StatusBadge } from '../components/Status'
import { useCountUp } from '../lib/countUp'
import { fmtDate } from '../lib/dates'
import { inr } from '../lib/money'
import { GreetHeading } from '../components/Welcome'
import { listItem } from '../lib/motion'
import { useSession } from '../lib/session'
import type { Link as ClientLink, Status, TimelineEvent } from '../lib/types'
import { useApi } from '../lib/useApi'
import '../components/page.css'
import './dashboard.css'

type Summary = {
  outstanding: number; collected: number; overdue: number; drafts: number; open: number; dueSoon: number; avgDaysToPaid: number | null;
  attention: { id: string; number: string; client: string; status: Status; due: string; balance: number }[]; activity: (TimelineEvent & { number: string; invoiceId: string })[]
}

function Stat({ label, value, money, note, tone }: { label: string; value: number; money?: boolean; note: string; tone?: string }) {
  const v = useCountUp(value)
  return <div className={`stat ${tone ?? ''}`}><small>{label}</small><b className="num">{money ? inr(v) : v}</b><span>{note}</span></div>
}

export default function Dashboard() {
  const { me } = useSession()
  const s = useApi<Summary>('/studio/invoices/summary/all')
  const links = useApi<ClientLink[]>('/studio/links')
  const d = s.data
  const hasClient = (links.data?.length ?? 0) > 0
  const hasInvoice = !!d && d.open + d.drafts + d.collected > 0

  return (
    <>
      <div className="ph">
        <div><GreetHeading name={me?.user?.name.split(' ')[0] ?? ''} /><p>{me?.business?.name} · {d ? (d.overdue ? `${d.overdue} overdue, reminders are running.` : d.open ? `${d.open} open, nothing overdue.` : 'All clear.') : ' '}</p></div>
        <div className="ph-actions"><Link to="/studio/new"><Button variant="primary"><FilePlus2 size={18} aria-hidden />New invoice</Button></Link></div>
      </div>

      {d && !hasInvoice && (
        <section className="start" aria-label="Getting started">
          <h2>Get going in two steps</h2>
          {[{ done: hasClient, to: '/studio/clients', label: 'Add your first client', note: 'Invite them by email or WhatsApp, or share your QR.' }, { done: hasInvoice, to: '/studio/new', label: 'Create an invoice', note: 'Pick a type, tap what you did, send. About a minute.' }].map((st, i) => (
            <Link key={st.to} to={st.to} className="start-i tap"><span className={`start-n ${st.done ? 'done' : ''}`}>{st.done ? <Check size={16} aria-label="Done" /> : i + 1}</span><span><b>{st.label}</b><small>{st.note}</small></span></Link>
          ))}
        </section>
      )}

      <section className="stats" aria-label="Summary">
        <Stat label="Outstanding" value={d?.outstanding ?? 0} money note={`${d?.open ?? 0} open`} />
        <Stat label="Collected" value={d?.collected ?? 0} money note="Received so far" tone="ok" />
        <Stat label="Due this week" value={d?.dueSoon ?? 0} money note="Not overdue yet" />
        <Stat label="Overdue" value={d?.overdue ?? 0} note={d?.overdue ? 'Reminders are running' : 'Nothing late'} tone={d?.overdue ? 'bad' : ''} />
      </section>

      <div className="dash-two">
        <div>
        {!!d?.attention.length && (
          <section className="sec">
            <div className="sec-h"><h2>Needs attention</h2><Link to="/studio/invoices">All invoices</Link></div>
            <div className="rows">
              {d.attention.map((i, n) => (
                <motion.div key={i.id} {...listItem(n)}>
                  <Link to={`/studio/invoices/${i.id}`} className="row tap">
                    <span className="row-main"><b className="trunc">{i.client}</b><span className="num">{i.number}</span></span>
                    <span className="row-sub num">Due {fmtDate(i.due)}</span>
                    <span className="row-amt num">{inr(i.balance)}</span>
                    <StatusBadge status={i.status} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
          {d && !d.attention.length && hasInvoice && <section className="sec"><div className="sec-h"><h2>Needs attention</h2></div><p className="insight">Nothing needs you right now.{d.avgDaysToPaid != null ? ` Clients usually pay ${d.avgDaysToPaid < 1 ? 'the same day' : `in ${d.avgDaysToPaid} ${d.avgDaysToPaid === 1 ? 'day' : 'days'}`}.` : ''}</p></section>}
        </div>
        <section className="sec">
          <div className="sec-h"><h2>Recent activity</h2></div>
          <Feed events={(d?.activity ?? []).slice(0, 6)} showWho="number" />
        </section>
      </div>

      <Insights />
    </>
  )
}
