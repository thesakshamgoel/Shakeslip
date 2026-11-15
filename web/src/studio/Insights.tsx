import { motion } from 'motion/react'
import { BarChart3, Table2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconButton } from '../components/Button'
import { Select } from '../components/Select'
import { inr } from '../lib/money'
import { springSoft } from '../lib/motion'
import type { Link as ClientLink } from '../lib/types'
import { useApi } from '../lib/useApi'
import './insights.css'

type Stats = {
  fy: string; fys: string[]; months: { month: string; invoiced: number; collected: number }[]; ageing: [number, number, number]
  gst: { cgst: number; sgst: number; igst: number }; quotes: { sent: number; converted: number }; totals: { invoiced: number; collected: number; count: number }
  clients: { id: string; name: string; invoiced: number; collected: number; outstanding: number; count: number; avgDays: number | null }[]
}
const MON = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' })
const mon = (m: string) => MON.format(new Date(`${m}-01T00:00:00Z`))
/* Short rupees for axis-free labels: ₹1.2L, ₹45K. */
const short = (p: number) => { const r = p / 100; return r >= 1e7 ? `₹${(r / 1e7).toFixed(1)}Cr` : r >= 1e5 ? `₹${(r / 1e5).toFixed(1)}L` : r >= 1e3 ? `₹${Math.round(r / 1e3)}K` : `₹${Math.round(r)}` }
const daysText = (d: number | null) => (d == null ? 'Not yet' : d < 1 ? 'Same day' : `${d} ${d === 1 ? 'day' : 'days'}`)

function MonthChart({ months }: { months: Stats['months'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...months.flatMap((m) => [m.invoiced, m.collected]))
  const peak = months.reduce((b, m, i) => (m.invoiced > months[b].invoiced ? i : b), 0)
  return (
    <div className="mc" onMouseLeave={() => setHover(null)}>
      {months.map((m, i) => (
        <div key={m.month} className={`mc-col ${hover === i ? 'on' : ''}`} tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
          aria-label={`${mon(m.month)}: invoiced ${inr(m.invoiced)}, collected ${inr(m.collected)}`}>
          <span className="mc-v num">{i === peak && m.invoiced ? short(m.invoiced) : ''}</span>
          <span className="mc-bars">
            {(['invoiced', 'collected'] as const).map((k, j) => (
              <motion.span key={k} className={`mc-bar s${j + 1}`} style={{ originY: 1 }} initial={{ scaleY: 0 }} animate={{ scaleY: m[k] ? Math.max(0.015, m[k] / max) : 0 }} transition={{ ...springSoft, delay: i * 0.025 }} />
            ))}
          </span>
          <span className="mc-m">{mon(m.month)}</span>
          {hover === i && (
            <span className={`mc-tip ${i > 8 ? 'left' : ''}`} role="tooltip">
              <strong>{mon(m.month)} {m.month.slice(0, 4)}</strong>
              <span><i className="lg-sw s1" />Invoiced <b className="num">{inr(m.invoiced)}</b></span>
              <span><i className="lg-sw s2" />Collected <b className="num">{inr(m.collected)}</b></span>
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/* Statistics for a financial year, with an optional client filter. Both live in the URL. */
export function Insights() {
  const [p, setP] = useSearchParams()
  const set = (k: string, v: string) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); setP(n, { replace: true }) }
  const fy = p.get('fy') ?? '', client = p.get('client') ?? ''
  const [table, setTable] = useState(false)
  const s = useApi<Stats>(`/studio/stats?fy=${encodeURIComponent(fy)}&client=${encodeURIComponent(client)}`).data
  const links = useApi<ClientLink[]>('/studio/links').data ?? []
  if (!s || (!s.totals.count && !client && !s.quotes.sent)) return null
  const gstTotal = s.gst.cgst + s.gst.sgst + s.gst.igst
  const ageMax = Math.max(1, ...s.ageing)
  const rate = s.quotes.sent ? Math.round((s.quotes.converted / s.quotes.sent) * 100) : null

  return (
    <section className="ins" aria-label="Insights">
      <div className="ins-h">
        <h2>Insights</h2>
        <div className="ins-f">
          <Select value={s.fy} onChange={(v) => set('fy', v === s.fys[0] ? '' : v)} options={s.fys.map((f) => ({ value: f, label: `FY ${f}` }))} />
          <Select value={client} onChange={(v) => set('client', v)} options={[{ value: '', label: 'All clients' }, ...links.map((l) => ({ value: l.id, label: l.company || l.name }))]} />
        </div>
      </div>

      <div className="stats ins-stats">
        <div className="stat"><small>Invoiced</small><b className="num">{inr(s.totals.invoiced)}</b><span>{s.totals.count} {s.totals.count === 1 ? 'invoice' : 'invoices'}</span></div>
        <div className="stat"><small>Collected</small><b className="num">{inr(s.totals.collected)}</b><span>{s.totals.invoiced ? Math.round((s.totals.collected / s.totals.invoiced) * 100) : 0}% of invoiced</span></div>
        <div className="stat"><small>GST charged</small><b className="num">{inr(gstTotal)}</b><span className="num">{s.gst.igst ? `IGST ${short(s.gst.igst)} · ` : ''}CGST {short(s.gst.cgst)} · SGST {short(s.gst.sgst)}</span></div>
        <div className="stat"><small>Quotes won</small><b className="num">{rate == null ? 'None' : `${rate}%`}</b><span>{s.quotes.sent ? `${s.quotes.converted} of ${s.quotes.sent} became invoices` : 'Send a quotation to track this'}</span></div>
      </div>

      <div className="ins-grid">
        <div className="chart ins-card">
          <div className="sec-h">
            <h3>By month</h3>
            <div className="ins-legend"><span><i className="lg-sw s1" />Invoiced</span><span><i className="lg-sw s2" />Collected</span>
              <IconButton label={table ? 'Show chart' : 'Show as table'} onClick={() => setTable(!table)}>{table ? <BarChart3 size={17} /> : <Table2 size={17} />}</IconButton></div>
          </div>
          {table ? (
            <table className="ins-table"><thead><tr><th>Month</th><th>Invoiced</th><th>Collected</th></tr></thead>
              <tbody>{s.months.map((m) => <tr key={m.month}><td>{mon(m.month)} {m.month.slice(0, 4)}</td><td className="num">{inr(m.invoiced)}</td><td className="num">{inr(m.collected)}</td></tr>)}</tbody></table>
          ) : <MonthChart months={s.months} />}
        </div>

        <div className="chart ins-card">
          <div className="sec-h"><h3>Overdue, by how late</h3></div>
          {s.ageing.some(Boolean) ? (
            <div className="age">
              {(['Up to 30 days', '31 to 60 days', 'Over 60 days'] as const).map((l, i) => (
                <div key={l} className="age-r"><span>{l}</span>
                  <span className="age-track"><motion.span className="age-bar" style={{ originX: 0 }} initial={{ scaleX: 0 }} animate={{ scaleX: s.ageing[i] / ageMax }} transition={{ ...springSoft, delay: i * 0.05 }} /></span>
                  <b className="num">{inr(s.ageing[i])}</b></div>
              ))}
            </div>
          ) : <p className="ins-empty">Nothing is overdue. Reminders go out on their own when something is.</p>}
        </div>
      </div>

      {!client && s.clients.length > 0 && (
        <div className="ins-clients">
          <h3>Top clients</h3>
          <table className="ins-table">
            <thead><tr><th>Client</th><th>Invoiced</th><th className="hide-sm">Collected</th><th>Owed</th><th className="hide-sm">Usually pays in</th></tr></thead>
            <tbody>{s.clients.slice(0, 8).map((c) => (
              <tr key={c.id} className="tap" tabIndex={0} onClick={() => set('client', c.id)} onKeyDown={(e) => e.key === 'Enter' && set('client', c.id)}>
                <td>{c.name}</td><td className="num">{inr(c.invoiced)}</td><td className="num hide-sm">{inr(c.collected)}</td><td className="num">{inr(c.outstanding)}</td><td className="hide-sm">{daysText(c.avgDays)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
