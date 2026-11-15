import { Hono } from 'hono'
import { bizOf, displayStatus, paidSum, rowTotals } from '../access.ts'
import { requireUser, type Vars } from '../auth.ts'
import { db } from '../db.ts'
import { isInterState, stateOf } from '../gst.ts'
import { financialYear, json } from '../util.ts'

export const stats = new Hono<{ Variables: Vars }>()
stats.use('*', requireUser)

const DAY = 86_400_000
export const isQuote = (snap: string) => { const t = json<{ prefix?: string; title?: string }>(snap, {}); return t.prefix === 'QTN' || /quot|estimate|proposal/i.test(t.title ?? '') }

/* Statistics for one financial year (April to March), optionally for one client. Rupees only; every figure in paise. */
stats.get('/', (c) => {
  const biz = bizOf(c.get('user').id)
  const empty = { fy: '', fys: [], months: [], clients: [], ageing: [0, 0, 0], gst: { cgst: 0, sgst: 0, igst: 0 }, quotes: { sent: 0, converted: 0 }, totals: { invoiced: 0, collected: 0, count: 0 } }
  if (!biz) return c.json(empty)
  const rows = db.query(`SELECT i.*, l.name AS client_name, l.company AS client_company, l.state AS client_state FROM invoices i JOIN links l ON l.id = i.link_id
    WHERE i.business_id = ? AND i.deleted_at IS NULL AND i.status NOT IN ('draft','void')`).all(biz.id) as any[]
  const live = rows.filter((r) => (json<{ currency?: string }>(r.extra ?? '{}', {}).currency ?? 'INR') === 'INR')
  const fys = [...new Set([financialYear(new Date().toISOString()), ...live.map((r) => financialYear(r.issued))])].sort().reverse()
  const fy = fys.includes(c.req.query('fy') ?? '') ? c.req.query('fy')! : fys[0]
  const client = c.req.query('client') ?? ''
  const inFy = live.filter((r) => financialYear(r.issued) === fy && (!client || r.link_id === client))
  const invoicesOnly = inFy.filter((r) => !isQuote(r.type_snapshot))

  const start = Number(fy.slice(0, 4))
  const months = [...Array(12)].map((_, i) => { const d = new Date(Date.UTC(start, 3 + i, 1)); return { month: d.toISOString().slice(0, 7), invoiced: 0, collected: 0 } })
  const byMonth = new Map(months.map((m) => [m.month, m]))
  const clients = new Map<string, { id: string; name: string; invoiced: number; collected: number; outstanding: number; count: number; days: number[] }>()
  const ageing = [0, 0, 0]
  const gst = { cgst: 0, sgst: 0, igst: 0 }
  const bizState = stateOf(biz.gstin, biz.state)
  const totals = { invoiced: 0, collected: 0, count: 0 }

  for (const r of invoicesOnly) {
    const t = rowTotals(r)
    const paid = Math.min(paidSum(r.id) + t.advance, t.total)
    const balance = Math.max(t.total - paid, 0)
    const m = byMonth.get(String(r.issued).slice(0, 7))
    if (m) { m.invoiced += t.total; m.collected += paid }
    totals.invoiced += t.total; totals.collected += paid; totals.count++
    const bill = json<{ gstin?: string; state?: string }>(r.bill_to, {})
    if (isInterState(bizState, stateOf(bill.gstin ?? '', bill.state ?? r.client_state ?? ''))) gst.igst += t.gst
    else { gst.cgst += Math.floor(t.gst / 2); gst.sgst += t.gst - Math.floor(t.gst / 2) }
    const k = r.link_id
    const cl = clients.get(k) ?? { id: k, name: r.client_company || r.client_name, invoiced: 0, collected: 0, outstanding: 0, count: 0, days: [] as number[] }
    cl.invoiced += t.total; cl.collected += paid; cl.outstanding += balance; cl.count++
    if (balance === 0 && r.sent_at) {
      const last = db.query("SELECT MAX(paid_at) AS at FROM payments WHERE invoice_id = ? AND status = 'confirmed'").get(r.id) as { at: string | null }
      if (last.at) cl.days.push(Math.max(0, Math.round((new Date(last.at).getTime() - new Date(r.sent_at).getTime()) / DAY)))
    }
    clients.set(k, cl)
    if (balance > 0 && displayStatus(r, balance) === 'overdue') {
      const late = (Date.now() - new Date(r.due).getTime()) / DAY
      ageing[late <= 30 ? 0 : late <= 60 ? 1 : 2] += balance
    }
  }

  const quotes = inFy.filter((r) => isQuote(r.type_snapshot))
  const converted = quotes.filter((q) => db.query("SELECT 1 FROM invoices WHERE source_id = ? AND deleted_at IS NULL AND status NOT IN ('draft','void')").get(q.id)).length

  return c.json({
    fy, fys, months, ageing, gst, totals, quotes: { sent: quotes.length, converted },
    clients: [...clients.values()].sort((a, b) => b.invoiced - a.invoiced).map(({ days, ...cl }) => ({ ...cl, avgDays: days.length ? Math.round(days.reduce((n, d) => n + d, 0) / days.length) : null })),
  })
})
